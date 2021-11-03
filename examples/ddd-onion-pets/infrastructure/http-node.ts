import { IncomingMessage, RequestOptions, request as requestHttp } from 'http'
import { request as requestHttps } from 'https'

import { Task, async } from '../../../src/async'
import { fail } from '../../../src/fail'
import { fromIO, fx } from '../../../src/fx'
import { fromPromise } from '../../../src/promise'
import { GetRequest, PostRequest } from './http'

export const request = <Request extends GetRequest | PostRequest<unknown>, Response>(r: Request) =>
  fx(function* () {
    const response = yield* async(http(createNodeRequest(r)))
    if (response instanceof Error) return yield* fail(response)
    return JSON.parse(yield* handleResponse(r, response)) as Response
  })

export const createNodeRequest = <Request extends GetRequest | PostRequest<unknown>>(
  request: Request
): NodeHttpRequestOptions => (request.method === 'POST' ? { ...request, body: JSON.stringify(request.body) } : request)

const handleResponse = <Request extends GetRequest | PostRequest<unknown>>(
  request: Request,
  response: IncomingMessage
) =>
  fx(function* () {
    if (response.statusCode === undefined || response.statusCode >= 300) {
      return yield* fail(new Error(`http ${response.statusCode}: ${request.method} ${request.url}`))
    }

    return yield* readResponseBody(response)
  })

export type NodeHttpRequestOptions = {
  method: RequestOptions['method']
  url: URL
  headers?: RequestOptions['headers']
  body?: string
}

export const http =
  ({ url, ...options }: NodeHttpRequestOptions): Task<never, IncomingMessage | Error> =>
  (k) => {
    const u = url.toString()
    const c = url.protocol === 'https:' ? requestHttps(u, options, k) : requestHttp(u, options, k)

    c.on('error', k).end(options.method === 'POST' && options.body)
    return fromIO(() => c.destroy(new Error(`http request aborted: ${url}`)))
  }

export const readResponseBody = (r: IncomingMessage) =>
  fromPromise<string, Error>(async () => {
    let d = ''
    for await (const s of r) d += s
    return d
  })
