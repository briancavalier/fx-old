import { Fiber } from './fiber'
import { Effect, Fx, fx, getHandlerContext } from './fx'

export class Join<R> extends Effect<Fiber<R>, R> {}

export const join = <A>(f: Fiber<A>) => new Join(f)

export class Concurrent<R> extends Effect<Fx<never, Fiber<R>>, Fiber<R>> {}

export const fork = <Y, R>(f: Fx<Y, R>) =>
  fx(function* () {
    const ff = yield* getHandlerContext<Y, R, Fiber<R>>(f)
    return yield* new Concurrent(ff)
  })
