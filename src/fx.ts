export abstract class Effect<A, R> {
  constructor(public readonly arg: A) {}
  *[Symbol.iterator](): Iterator<this, R, R> {
    return yield this
  }
}

interface FxCore<Y, R, A> {
  [Symbol.iterator](): Iterator<Y, R, A>
}

export interface Fx<Y, R> extends FxCore<Y, R, unknown> {
  [Symbol.iterator](): Iterator<Y, R, unknown>
}

export const fx = <Y, R, A>(f: () => Generator<Y, R, A>): Fx<Y, R> => ({
  [Symbol.iterator]: f
})

export const pure = <R>(r: R): Fx<never, R> => ({
  *[Symbol.iterator]() {
    return r
  }
})

export const run = <R>(fx: Fx<never, R>): R => fx[Symbol.iterator]().next().value

export const handle = <Y, R, A, Y2>(f: FxCore<Y, R, A>, h: (effect: Y) => Fx<Y2, A>): Fx<Y2, R> => handler(h)(f)

export const handler =
  <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) =>
  <Y, R>(f: FxCore<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> =>
    fx(function* () {
      const i = f[Symbol.iterator]()
      let ir = i.next()

      while (!ir.done) ir = i.next(yield* h(ir.value as unknown as Y1))

      return ir.value
    })
