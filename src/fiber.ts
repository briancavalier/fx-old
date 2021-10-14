import { Async, Dispose } from './async'
import { Fx, fx } from './fx'

export type Fiber<A> = [Dispose, Promise<A>]

export const dispose = <A>([dispose]: Fiber<A>): void => dispose()

export const promise = <A>([, promise]: Fiber<A>): Promise<A> => promise

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noDispose = () => {}

export const forkFiber = <Y extends Async<unknown>, R>(f: Fx<Y, R>): Fx<never, Fiber<R>> =>
  fx(function* () {
    let _dispose: Dispose = noDispose

    const stepAsync = (i: Iterator<Y, R, unknown>, ir: IteratorResult<Y, R>, k: (r: R) => void): void => {
      if (ir.done) {
        _dispose = noDispose
        return k(ir.value)
      }
      _dispose = ir.value.arg((a) => stepAsync(i, i.next(a), k))
    }

    const i = f[Symbol.iterator]()
    const dispose = () => _dispose()

    const promise = new Promise<R>((resolve) => stepAsync(i, i.next(), resolve))

    return [dispose, promise]
  })
