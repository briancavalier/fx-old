import { Async, Task, async, disposeNone } from './async'
import { Fx, defer } from './fx'

export type Fiber<D, A> = [Fx<D, void>, Promise<A>]

export const dispose = <D, A>([dispose]: Fiber<D, A>): Fx<D, void> => dispose

export const promise = <D, A>([, promise]: Fiber<D, A>): Promise<A> => promise

export const join = <D, A>([dispose, promise]: Fiber<D, A>): Async<D, A> =>
  async<D, A>((resume) => {
    promise.then(resume, resume)
    return dispose
  })

export const runTask = <D, A>(t: Task<D, A>): Fiber<D, A> => {
  let _dispose = disposeNone as Fx<D, void>
  return [defer(() => _dispose), new Promise<A>((resolve) => (_dispose = t(resolve)))]
}

export const flatten = <D1, D2, A>([dispose, promise]: Fiber<D1, Fiber<D2, A>>): Fiber<D1 | D2, A> => {
  let _dispose: Fx<D1 | D2, void> = dispose
  return [defer(() => _dispose), promise.then(([d, p]) => ((_dispose = d), p))]
}
