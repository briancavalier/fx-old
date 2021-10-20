import { async } from '../src/async'
import { Concurrent, Join, fork, join } from '../src/concurrent'
import { Fiber, promise } from '../src/fiber'
import { Effect, Fx, HandlerContext, fx, handler, run } from '../src/fx'
import { withFiberAsync } from '../src/handle/fiberAsync'
import { withUnboundedConcurrency } from '../src/handle/unboundedConcurrency'

class Delay extends Effect<number, void> {}

const delay = <A>(ms: number, a: A): Fx<Delay, A> =>
  fx(function* () {
    yield* new Delay(ms)
    return a
  })

const delayTree = (
  ms: number,
  depth: number
): Fx<HandlerContext<unknown, number, Fiber<number>> | Delay | Join<number> | Concurrent<number>, number> =>
  fx(function* () {
    if (depth <= 1) return yield* delay(ms, 1)

    const fibers = [] as Fiber<number>[]
    for (let i = 0; i < depth; i++) fibers.push(yield* fork(delayTree(ms, depth - 1)))

    let result = 0
    for (const t of fibers) result += yield* join(t)

    return result
  })

const handleDelay = handler(function* (effect: Delay) {
  if (effect instanceof Delay)
    return yield* async<void>((resume) => {
      const t = setTimeout(resume, effect.arg)
      return () => clearTimeout(t)
    })

  return yield effect
})

const start = Date.now()

const handleConcurrency = withUnboundedConcurrency(setImmediate, clearImmediate)

const r = run(withFiberAsync(handleConcurrency(handleDelay(delayTree(1000, 5)))))

promise(r).then((result) => console.log('DONE result:', result, 'time:', Date.now() - start, 'ms'))
