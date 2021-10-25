import { Async, async } from '../src/async'
import { Concurrent, fork } from '../src/concurrent'
import { Fiber, dispose, join, promise } from '../src/fiber'
import { Effect, Fx, HandlerContext, fromIO, fx, handler, run } from '../src/fx'
import { withFiberAsync } from '../src/handle/fiberAsync'
import { withUnboundedConcurrency } from '../src/handle/unboundedConcurrency'

class Delay extends Effect<number, void> {}

const delay = <A>(ms: number, a: A) =>
  fx(function* () {
    yield* new Delay(ms)
    return a
  })

const delayTree = (
  ms: number,
  depth: number
): Fx<
  HandlerContext<unknown, unknown, Fiber<never, unknown>> | Async<never, unknown> | Delay | Concurrent<never, unknown>,
  number
> =>
  fx(function* () {
    if (depth <= 1) return yield* delay(ms, 1)

    const fibers = [] as Fiber<never, number>[]
    for (let i = 0; i < depth; i++) fibers.push(yield* fork(delayTree(ms, depth - 1)))

    let result = 0
    for (const f of fibers) result += yield* join(f)

    return result
  })

const handleDelay = handler(function* (effect: Delay) {
  if (effect instanceof Delay)
    return yield* async<never, void>((resume) => {
      const t = setTimeout(resume, effect.arg)
      return fromIO(() => clearTimeout(t))
    })

  return yield effect
})

const start = Date.now()

const handleConcurrency = withUnboundedConcurrency(setImmediate, clearImmediate)

const r = run(withFiberAsync(handleConcurrency(handleDelay(delayTree(1000, 5)))))
run(dispose(r))

promise(r).then((result) => console.log('DONE result:', result, 'time:', Date.now() - start, 'ms'))
