import { Async, disposeNone } from '../async'
import { Fiber } from '../fiber'
import { Fx, HandlerContext, defer, fx } from '../fx'

type EffectsOf<Y> = Y extends unknown ? GetDisposeEffects<Y> : never
type GetDisposeEffects<Y> = Y extends Async<infer D, unknown> ? D : never

export const withFiberAsync = <
  D extends EffectsOf<Y>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Y extends Async<any, unknown> | HandlerContext<unknown, unknown, Fiber<unknown, unknown>>,
  R
>(
  f: Fx<Y, R>
): Fx<never, Fiber<D, R>> =>
  fx(function* () {
    let _dispose: Fx<D, void> = disposeNone

    const stepAsync = (i: Iterator<Y, R, unknown>, ir: IteratorResult<Y, R>, resolve: (r: R) => void): void => {
      if (ir.done) return resolve(ir.value)
      if (ir.value instanceof HandlerContext)
        return stepAsync(i, i.next(withFiberAsync(ir.value.arg as Fx<Y, unknown>)), resolve)
      _dispose = ir.value.arg((a) => stepAsync(i, i.next(a), resolve))
    }

    const i = f[Symbol.iterator]()
    const promise = new Promise<R>((resolve) => stepAsync(i, i.next(), resolve))

    return [defer(() => _dispose), promise]
  })
