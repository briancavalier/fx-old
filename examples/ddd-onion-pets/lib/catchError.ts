import { Fail } from '../../../src/fail'
import { Fx, handleWith, pure } from '../../../src/fx'

export type CatchError<Y, E> = Exclude<Y, FailOf<E>>
type FailOf<E> = E extends unknown ? Fail<E> : never

type ErrorsOf<Y> = Y extends Fail<infer E> ? E : never

export const attempt = <Y, R>(f: Fx<Y, R>) => catchError(f, pure)

export const catchError = <Y, R, Y1, R1, E extends ErrorsOf<Y>>(
  f: Fx<Y, R>,
  handleError: (e: E) => Fx<Y1, R1>
): Fx<Y1 | CatchError<Y, E>, R | R1> =>
  handleWith(f, function* (f: Fx<Y, R>) {
    const i = f[Symbol.iterator]()
    let ir = i.next()
    while (!ir.done)
      if (ir.value instanceof Fail) return yield* handleError(ir.value.arg)
      else ir = i.next(yield ir.value as CatchError<Y, E>)

    return ir.value
  })
