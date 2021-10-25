import { IncomingMessage, RequestOptions, request as requestHttp } from 'http'
import { request as requestHttps } from 'https'

import { Task, async } from '../../../src/async'
import { fail } from '../../../src/fail'
import { fromIO, fx } from '../../../src/fx'
import { fromPromise } from '../../../src/promise'
import { GetRequest, PostRequest } from './http'

export const request = <Request extends GetRequest | PostRequest<unknown>, Response>(r: Request) =>
  fx(function* () {
    const response = yield* async<never, IncomingMessage>(http(createNodeRequest(r)))
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
  ({ url, ...options }: NodeHttpRequestOptions): Task<never, IncomingMessage> =>
  (k) => {
    const c =
      url.protocol === 'https:' ? requestHttps(url.toString(), options, k) : requestHttp(url.toString(), options, k)

    c.end(options.method === 'POST' && options.body)
    return fromIO(() => c.destroy())
  }

export const readResponseBody = (r: IncomingMessage) =>
  fromPromise<string, Error>(async () => {
    let d = ''
    for await (const s of r) d += s
    return d
  })
