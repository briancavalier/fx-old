import { Fiber, dispose, join, promise } from './fiber'
import { Effect, EffectsOf, Fx, HandlerContext, ResultOf, fx, getHandlerContext } from './fx'

export class Concurrent<D, R> extends Effect<Fx<never, Fiber<D, R>>, Fiber<D, R>> {}

export const fork = <Y, D, R>(f: Fx<Y, R>): Fx<Y | HandlerContext<Y, R, Fiber<D, R>> | Concurrent<D, R>, Fiber<D, R>> =>
  fx(function* () {
    const ff = yield* getHandlerContext<Y, R, Fiber<D, R>>(f)
    return yield* new Concurrent(ff)
  })

export type AllEffects<Fxs extends readonly Fx<unknown, unknown>[]> = EffectsOf<Fxs[keyof Fxs]>

export type Race<Fxs extends readonly Fx<unknown, unknown>[]> = ResultOf<Fxs[keyof Fxs]>

export const race = <Fxs extends readonly Fx<unknown, unknown>[]>(
  ...fxs: Fxs
): Fx<AllEffects<Fxs> | Concurrent<unknown, unknown>, Race<Fxs>> =>
  fx(function* () {
    const fibers = [] as Fiber<unknown, unknown>[]
    for (const f of fxs) fibers.push(yield* fork(f))

    const raced = raceFibers(fibers)
    try {
      return yield* join(raced)
    } finally {
      yield* dispose(raced)
    }
  }) as Fx<AllEffects<Fxs>, Race<Fxs>>

export type All<Fxs extends readonly Fx<unknown, unknown>[]> = {
  [K in keyof Fxs]: ResultOf<Fxs[K]>
}

export const all = <Fxs extends readonly Fx<unknown, unknown>[]>(
  ...fxs: Fxs
): Fx<AllEffects<Fxs> | Concurrent<unknown, unknown>, All<Fxs>> =>
  fx(function* () {
    const fibers = [] as Fiber<unknown, unknown>[]
    for (const f of fxs) fibers.push(yield* fork(f))

    const results = [] as unknown[]
    for (const f of fibers) results.push(yield* join(f))

    try {
      return results as readonly unknown[]
    } finally {
      yield* disposeAll(fibers)
    }
  }) as Fx<AllEffects<Fxs>, All<Fxs>>

export const disposeAll = <Fxs extends readonly Fx<unknown, unknown>[]>(fxs: Fxs): Fx<AllEffects<Fxs>, void> =>
  fx(function* () {
    for (const f of fxs) yield* f
  }) as Fx<AllEffects<Fxs>, void>

export type DisposeEffects<Fibers extends readonly Fiber<unknown, unknown>[]> = DisposeEffectsOf<Fibers[keyof Fibers]>
export type DisposeEffectsOf<F> = F extends Fiber<infer D, unknown> ? D : never

export type RaceFibers<Fibers extends readonly Fiber<unknown, unknown>[]> = FiberResult<Fibers[keyof Fibers]>
export type FiberResult<F> = F extends Fiber<unknown, infer A> ? A : never

export const raceFibers = <Fibers extends readonly Fiber<unknown, unknown>[]>(
  fibers: Fibers
): Fiber<DisposeEffects<Fibers>, RaceFibers<Fibers>> =>
  [disposeAll(fibers.map(dispose)), Promise.race(fibers.map(promise))] as Fiber<
    DisposeEffects<Fibers>,
    RaceFibers<Fibers>
  >
