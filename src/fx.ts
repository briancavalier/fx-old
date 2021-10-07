export abstract class Effect<A, R> {
  constructor(public readonly arg: A) {}
  *[Symbol.iterator](): Iterator<this, R, R> {
    return yield this
  }
}

export interface Fx<Y, R, A> {
  [Symbol.iterator](): Iterator<Y, R, A>
}

export const fx = <Y, R, A>(f: () => Generator<Y, R, A>): Fx<Y, R, A> => ({
  [Symbol.iterator]: () => f()
})

export const pure = <R>(r: R): Fx<never, R, never> => ({
  *[Symbol.iterator]() {
    return r
  }
})

export const run = <R, A>(fx: Fx<never, R, A>): R => fx[Symbol.iterator]().next().value

export const handle = <Y, R, A, B, Y2>(f: Fx<Y, R, A>, handler: (effect: Y) => Fx<Y2, A, unknown>): Fx<Y2, R, B> =>
  fx(function* () {
    const i = f[Symbol.iterator]()
    let ir = i.next()

    while (!ir.done) ir = i.next(yield* handler(ir.value))

    return ir.value
  })
