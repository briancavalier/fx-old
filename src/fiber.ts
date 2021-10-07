import { Async, Dispose } from './async'
import { Fx, fx } from './fx'

export type Fiber<A> = [Dispose, Promise<A>]

export const dispose = <A>([dispose]: Fiber<A>): void => dispose()

export const promise = <A>([, promise]: Fiber<A>): Promise<A> => promise

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noDispose = () => {}

export const fork = <R, A, Y extends Async<unknown>>(f: Fx<Y, R, A>): Fx<never, Fiber<R>, never> =>
  fx(function* () {
    let _dispose: Dispose = noDispose

    const stepAsync = async (i: Iterator<Y, R, A>, ir: IteratorResult<Y, R>): Promise<R> => {
      if (ir.done) return ir.value

      const a = await new Promise((resolve) => {
        _dispose = ir.value.arg(resolve)
      })
      return stepAsync(i, i.next(a as A))
    }

    const i = f[Symbol.iterator]()
    const dispose = () => _dispose()
    const promise = stepAsync(i, i.next()).then((x) => {
      _dispose = noDispose
      return x
    })

    return [dispose, promise]
  })
