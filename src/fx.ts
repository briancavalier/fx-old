export abstract class Effect<T, A, R> {
  _t!: T
  constructor(public readonly arg: A) {}
  *[Symbol.iterator](): Iterator<this, R, R> {
    return yield this
  }
}

export interface Fx<Y, R, A = unknown> {
  [Symbol.iterator](): Iterator<Y, R, A>
}

export type EffectsOf<F> = F extends Fx<infer Y, unknown> ? Y : never
export type ResultOf<F> = F extends Fx<unknown, infer A> ? A : never

export const fx = <Y, R>(f: () => Generator<Y, R>): Fx<Y, R> => ({
  [Symbol.iterator]: f
})

export const pure = <R>(r: R): Fx<never, R> => ({
  *[Symbol.iterator]() {
    return r
  }
})

export const fromIO = <A>(io: () => A): Fx<never, A> =>
  fx(function* () {
    return io()
  })

export const defer = <Y, R>(f: () => Fx<Y, R>): Fx<Y, R> =>
  fx(function* () {
    return yield* f()
  })

export const run = <R>(fx: Fx<never, R>): R => fx[Symbol.iterator]().next().value

export const handler = <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) =>
  function* <Y, R>(f: Fx<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> {
    const i = f[Symbol.iterator]()
    let ir = i.next()

    while (!ir.done) ir = i.next(yield* h(ir.value as unknown as Y1))

    return ir.value
  }
