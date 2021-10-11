import { IncomingMessage, RequestOptions, request as requestHttp } from 'http'
import { request as requestHttps } from 'https'

import { Async, Task, async } from '../../../src/async'
import { fail } from '../../../src/fail'
import { fx } from '../../../src/fx'
import { GetRequest, PostRequest } from './http'

export const request = <Request extends GetRequest | PostRequest<unknown>, Response>(r: Request) =>
  fx(function* () {
    const response = yield* async<IncomingMessage>(http(createNodeRequest(r)))
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

    const result = yield* readResponseBody(response)

    return result instanceof Error ? yield* fail(result) : result
  })

export type NodeHttpRequestOptions = {
  method: RequestOptions['method']
  url: URL
  headers?: RequestOptions['headers']
  body?: string
}

export const http =
  ({ url, ...options }: NodeHttpRequestOptions): Task<IncomingMessage> =>
  (k) => {
    const c =
      url.protocol === 'https:' ? requestHttps(url.toString(), options, k) : requestHttp(url.toString(), options, k)

    c.end(options.method === 'POST' && options.body)
    return () => (console.log('destroy'), c.destroy())
  }

export const readResponseBody = (r: IncomingMessage): Async<string | Error> =>
  async(
    asTask(async () => {
      let d = ''
      for await (const s of r) d += s
      return d
    })
  )

const asTask =
  <A, E = unknown>(f: () => Promise<A>): Task<A | E> =>
  (k) => {
    f().then(k, k)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {}
  }
