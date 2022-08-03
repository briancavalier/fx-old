export type Fiber<A, E> = FiberState<Active<A, E>> | FiberState<Completed<A>> | FiberState<Aborted<E>>

export class FiberImpl<A, E, C> {
  constructor(public state: Active<A, E> | Completed<A> | Aborted<E>, public readonly context: C) {}
}

export type FiberState<S> = { state: S }

export type Completed<A> = { readonly type: 'completed'; readonly value: A }
export type Aborted<E> = { readonly type: 'aborted'; readonly reason: E }
export type Active<A, E> = {
  readonly type: 'active'
  readonly waiters: ((a: FiberState<Completed<A>> | FiberState<Aborted<E>>) => void)[]
  readonly abort: () => void
}

export type Unwait = () => void

export const isActive = <A, E>(f: Fiber<A, E>): f is FiberState<Active<A, E>> => f.state.type === 'active'
export const isCompleted = <A, E>(f: Fiber<A, E>): f is FiberState<Completed<A>> => f.state.type === 'completed'

export const forkFiber = <A, C>(t: (f: (a: A) => void) => () => void, context?: C): Fiber<A, unknown> => {
  const x: any = setImmediate(() => (abort = t((a) => complete(fiber, a))))
  let abort = () => clearImmediate(x)
  // const abort = t((a) => complete(fiber, a))
  const fiber = new FiberImpl({ type: 'active', waiters: [], abort: () => abort() }, context) as Fiber<A, unknown>
  return fiber
}

export const wait = <A, E>(
  f: Fiber<A, E>,
  waiter: (a: FiberState<Completed<A>> | FiberState<Aborted<E>>) => void
): Unwait => {
  if (isActive(f)) {
    f.state.waiters.push(waiter)
    return () => {
      if (f.state.type === 'active') {
        f.state = { ...f.state, waiters: f.state.waiters.filter((w) => waiter !== w) }
      }
    }
  } else {
    waiter(f)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {}
  }
}

export const complete = <A, E>(f: Fiber<A, E>, value: A): void => {
  if (f.state.type !== 'active') return
  const { waiters } = f.state
  f.state = { type: 'completed', value }
  waiters.forEach((w) => w(f as FiberState<Completed<A>>))
}

export const abort = <A, E>(f: Fiber<A, E>, reason: E): void => {
  if (f.state.type !== 'active') return
  const { waiters } = f.state

  f.state.abort()

  f.state = { type: 'aborted', reason }
  waiters.forEach((w) => w(f as FiberState<Aborted<E>>))
}

export const waitNext = <Fibers extends readonly Fiber<any, any>[]>(
  fibers: Fibers,
  w: (fibers: Fibers) => void
): Unwait => {
  let done = false
  const unwaits = fibers.map((f) =>
    wait(f, () => {
      if (done) return
      done = true
      setImmediate(() => unwaitAll())
      w(fibers)
    })
  )

  const unwaitAll = () => unwaits.forEach((u) => u())
  return unwaitAll
}
