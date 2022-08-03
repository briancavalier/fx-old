export abstract class Effect<T extends string, A, R> {
  _effect!: T
  constructor(public readonly arg: A) {}
  *[Symbol.iterator](): Iterator<this, R, R> {
    return yield this
  }
}

export interface FxInternal<Y, R, A> {
  [Symbol.iterator](): Iterator<Y, R, A>
}

export type Fx<Y, R> = FxInternal<Y, R, unknown>

export type EffectsOf<F> = F extends Fx<infer Y, unknown> ? Y : never
export type ResultOf<F> = F extends Fx<unknown, infer R> ? R : never

export const fx = <Y, R>(f: () => Generator<Y, R>): Fx<Y, R> => ({
  [Symbol.iterator]: f
})

export const pure = <R>(x: R): Fx<never, R> =>
  fx(function* () {
    return x
  })

export const run = <R>(fx: Fx<never, R>): R => fx[Symbol.iterator]().next().value

export const handler = <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) =>
  function* <Y, R>(f: FxInternal<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> {
    const i = f[Symbol.iterator]()
    let ir = i.next()

    while (!ir.done) ir = i.next(yield* h(ir.value as unknown as Y1))

    return ir.value
  }
