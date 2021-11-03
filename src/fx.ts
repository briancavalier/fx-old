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

export class HandlerContext<Y, R, R1> extends Effect<Fx<Y, R>, Fx<never, R1>> {}

export const getHandlerContext = <Y, R, R1>(f: Fx<Y, R>): HandlerContext<Y, R, R1> => new HandlerContext(f)

export const handler =
  <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) =>
  <Y, R>(f: FxCore<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> =>
    handleWith(f, function* (f) {
      const i = f[Symbol.iterator]()
      let ir = i.next()

      while (!ir.done) ir = i.next(yield* h(ir.value as unknown as Y1))

      return ir.value
    })

export const handleWith = <Y, R, Y1, R1>(f: Fx<Y, R>, h: (f: Fx<Y, R>) => Fx<Y1, R1>): Fx<Y1, R1> => {
  const handler = function* (f: Fx<Y, R>): Fx<Y1, R1> {
    const i = h(f)[Symbol.iterator]()
    let ir = i.next()

    while (!ir.done)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (ir.value instanceof HandlerContext) ir = i.next(yield* new HandlerContext(handler(ir.value.arg)) as any)
      else ir = i.next(yield ir.value)

    return ir.value
  }

  return handler(f)
}
