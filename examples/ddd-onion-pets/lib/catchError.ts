import { Fail } from '../../../src/fail'
import { Fx, HandlerContext, pure } from '../../../src/fx'

export type CatchError<Y, E> = Exclude<Y, FailOf<E>>
type FailOf<E> = E extends unknown ? Fail<E> : never

type ErrorsOf<Y> = Y extends Fail<infer E> ? E : never

export const attempt = <Y, R>(f: Fx<Y, R>) => catchError(f, pure)

export const catchError = <Y, R, Y1, R1, E extends ErrorsOf<Y>>(
  f: Fx<Y, R>,
  handleError: (e: E) => Fx<Y1, R1>
): Fx<Y1 | CatchError<Y, E>, R | R1> => {
  function* handler<Y, R>(f: Fx<Y, R>): Fx<Y1 | CatchError<Y, E>, R | R1> {
    const i = f[Symbol.iterator]()
    let ir = i.next()
    while (!ir.done) {
      if (ir.value instanceof HandlerContext) ir = i.next(yield* new HandlerContext(handler(ir.value.arg)) as any)

      if (ir.value instanceof Fail) return yield* handleError(ir.value.arg)
      else ir = i.next(yield ir.value as CatchError<Y, E>)
    }
    return ir.value
  }
  return handler(f)
}
