export abstract class Effect<T extends string, A, R> {
  _effect!: T
  constructor(public readonly arg: A) {}
  *[Symbol.iterator](): Iterator<this, R, R> {
    return yield this
  }
}

interface FxInternal<Y, R, A> {
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

export const handler =
  <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) =>
  <Y, R>(f: FxInternal<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> =>
    withHandler(f, function* (i) {
      let ir = i.next()
      while (!ir.done) ir = i.next(yield* h(ir.value as unknown as Y1))
      return ir.value
    })

export const withHandler = <Y1, R1, A1, Y2, R2>(
  f: FxInternal<Y1, R1, A1>,
  h: (i: Iterator<Y1, R1, A1>) => Fx<Y2, R2>
) => ({
  [Symbol.iterator]() {
    const i = f[Symbol.iterator]()
    const hi = h(i)[Symbol.iterator]()

    return {
      next(x: A1) {
        const hir = hi.next(x)
        return hir.done ? this.return(hir.value) : hir
      },
      return(x: R2): IteratorResult<Y2, R2> {
        i.return && i.return()
        return { done: true, value: x }
      }
    }
  }
})
