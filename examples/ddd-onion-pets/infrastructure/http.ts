import { Effect } from '../../../src/fx'

export type RequestHeaders = Record<string, string>

export type GetRequest = { method: 'GET'; url: URL; headers?: RequestHeaders }
export type PostRequest<Body> = { method: 'POST'; url: URL; headers?: RequestHeaders; body: Body }

export class Http<Request, Response> extends Effect<Request, Response> {}

export const get = <Response>(url: URL, headers: RequestHeaders = {}): Http<GetRequest, Response> =>
  new Http({ method: 'GET', url, headers })

export const post = <Body, Response>(
  url: URL,
  body: Body,
  headers: RequestHeaders = {}
): Http<PostRequest<Body>, Response> => new Http({ method: 'POST', url, body, headers })
