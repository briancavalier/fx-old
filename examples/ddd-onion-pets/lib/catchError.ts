import { Fail } from '../../../src/fail'
import { Fx, fx, pure } from '../../../src/fx'

export type CatchError<Y, E> = Exclude<Y, FailOf<E>>
type FailOf<E> = E extends unknown ? Fail<E> : never

type ErrorsOf<Y> = Y extends Fail<infer E> ? E : never

export const attempt = <Y, R, E extends ErrorsOf<Y>>(f: Fx<Y, R>): Fx<CatchError<Y, E>, R | E> => catchError(f, pure)

export const catchError = <Y, R, Y1, R1, E extends ErrorsOf<Y>>(
  f: Fx<Y, R>,
  handleError: (e: E) => Fx<Y1, R1>
): Fx<Y1 | CatchError<Y, E>, R | R1> =>
  fx(function* () {
    const i = f[Symbol.iterator]()
    let ir = i.next()
    while (!ir.done) {
      const effect = ir.value
      if (effect instanceof Fail) return yield* handleError(effect.arg)
      else {
        const a = yield effect as CatchError<Y, E>
        ir = i.next(a)
      }
    }
    return ir.value
  })
