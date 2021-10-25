import { Dispose, Task, async, disposeNone } from './async'

export type Fiber<A> = [Dispose, Promise<A>]

export const dispose = <A>([dispose]: Fiber<A>): void => dispose()

export const promise = <A>([, promise]: Fiber<A>): Promise<A> => promise

export const join = <A>([dispose, promise]: Fiber<A>) =>
  async<A>((resume) => {
    promise.then(resume, resume)
    return dispose
  })

export const runTask = <A>(t: Task<A>): Fiber<A> => {
  let _dispose = disposeNone
  return [
    () => _dispose(),
    new Promise<A>((resolve) => {
      _dispose = t(resolve)
    })
  ]
}

export const flatten = <A>([dispose, promise]: Fiber<Fiber<A>>): Fiber<A> => {
  let _dispose: Dispose = dispose
  return [
    () => _dispose(),
    promise.then(([d, p]) => {
      _dispose = d
      return p
    })
  ]
}
