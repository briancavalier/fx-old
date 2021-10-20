import { Async, Dispose } from '../async'
import { Fiber } from '../fiber'
import { Fx, HandlerContext, fx } from '../fx'

export const withFiberAsync = <Y extends Async<unknown> | HandlerContext<unknown, R, Fiber<R>>, R>(
  f: Fx<Y, R>
): Fx<never, Fiber<R>> =>
  fx(function* () {
    let _dispose: Dispose

    const stepAsync = (i: Iterator<Y, R, unknown>, ir: IteratorResult<Y, R>, resolve: (r: R) => void): void => {
      if (ir.done) return resolve(ir.value)
      if (ir.value instanceof HandlerContext)
        return stepAsync(i, i.next(withFiberAsync(ir.value.arg as Fx<Y, unknown>)), resolve)
      _dispose = ir.value.arg((a) => stepAsync(i, i.next(a), resolve))
    }

    const i = f[Symbol.iterator]()
    const promise = new Promise<R>((resolve) => stepAsync(i, i.next(), resolve))

    return [() => _dispose(), promise]
  })
