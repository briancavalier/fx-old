import { Async, async } from './async'
import { Fx } from './fx'

export type Fiber<D, A> = [Fx<D, void>, Promise<A>]

export const dispose = <D, A>([dispose]: Fiber<D, A>): Fx<D, void> => dispose

export const promise = <D, A>([, promise]: Fiber<D, A>): Promise<A> => promise

export const join = <D, A>([dispose, promise]: Fiber<D, A>): Async<D, A> =>
  async<D, A>((resume) => {
    promise.then(resume, resume)
    return dispose
  })
