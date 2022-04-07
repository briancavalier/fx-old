import { Async, async, disposeNone } from '../async'
import { Fx, defer, fx } from '../fx'

type EffectsOf<Y> = Y extends unknown ? GetDisposeEffects<Y> : never
type GetDisposeEffects<Y> = Y extends Async<infer D, unknown> ? D : never

export const withFiberAsync = <
  D extends EffectsOf<Y>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Y extends Async<any, unknown>,
  R
>(
  f: Fx<Y, R>
): Fx<never, Fiber<D, R>> =>
  fx(function* () {
    let _dispose: Fx<D, void> = disposeNone

    const stepAsync = (i: Iterator<Y, R, unknown>, ir: IteratorResult<Y, R>, resolve: (r: R) => void): void => {
      if (ir.done) return resolve(ir.value)
      _dispose = ir.value.arg((a) => stepAsync(i, i.next(a), resolve))
    }

    const i = f[Symbol.iterator]()
    const promise = new Promise<R>((resolve) => stepAsync(i, i.next(), resolve))

    return [defer(() => _dispose), promise]
  })

export type Fiber<D, A> = [Fx<D, void>, Promise<A>]

export const dispose = <D, A>([dispose]: Fiber<D, A>): Fx<D, void> => dispose

export const promise = <D, A>([, promise]: Fiber<D, A>): Promise<A> => promise

export const join = <D, A>([dispose, promise]: Fiber<D, A>): Async<D, A> =>
  async<D, A>((resume) => {
    promise.then(resume, resume)
    return dispose
  })
