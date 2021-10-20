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

export const fx = <Y, R>(f: () => Generator<Y, R>): Fx<Y, R> => ({
  [Symbol.iterator]: f
})

export const pure = <R>(r: R): Fx<never, R> => ({
  *[Symbol.iterator]() {
    return r
  }
})

export const run = <R>(fx: Fx<never, R>): R => fx[Symbol.iterator]().next().value

export class HandlerContext<Y, R, R1> extends Effect<Fx<Y, R>, Fx<never, R1>> {}

export const getHandlerContext = <Y, R, R1>(f: Fx<Y, R>): HandlerContext<Y, R, R1> => new HandlerContext(f)

// export const pushContext = (c: HandlerContext, h: UnknownHandler): HandlerContext => new HandlerContext([...c.arg, h])

export const handler = <Y1, Y2, A>(h: (effect: Y1) => Fx<Y2, A>) => {
  const handler = <Y, R>(f: FxCore<Y, R, A>): Fx<Y2 | Exclude<Y, Y1>, R> =>
    fx(function* () {
      const i = f[Symbol.iterator]()
      let ir = i.next()

      while (!ir.done)
        if (ir.value instanceof HandlerContext) ir = i.next(yield* new HandlerContext(handler(ir.value.arg)) as any)
        else ir = i.next(yield* h(ir.value as unknown as Y1))

      return ir.value
    })

  return handler
}
