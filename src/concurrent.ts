import { Fiber } from './fiber'
import { Effect, Fx, HandlerContext, fx, getHandlerContext } from './fx'

export class Concurrent<R> extends Effect<Fx<never, Fiber<R>>, Fiber<R>> {}

export const fork = <Y, R>(f: Fx<Y, R>): Fx<Y | HandlerContext<Y, R, Fiber<R>> | Concurrent<R>, Fiber<R>> =>
  fx(function* () {
    const ff = yield* getHandlerContext<Y, R, Fiber<R>>(f)
    return yield* new Concurrent(ff)
  })
