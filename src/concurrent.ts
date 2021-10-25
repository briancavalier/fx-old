import { Fiber } from './fiber'
import { Effect, Fx, HandlerContext, fx, getHandlerContext } from './fx'

export class Concurrent<D, R> extends Effect<Fx<never, Fiber<D, R>>, Fiber<D, R>> {}

export const fork = <Y, D, R>(f: Fx<Y, R>): Fx<Y | HandlerContext<Y, R, Fiber<D, R>> | Concurrent<D, R>, Fiber<D, R>> =>
  fx(function* () {
    const ff = yield* getHandlerContext<Y, R, Fiber<D, R>>(f)
    return yield* new Concurrent(ff)
  })
