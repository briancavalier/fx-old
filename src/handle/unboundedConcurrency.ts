import { async } from '../async'
import { Concurrent, Join } from '../concurrent'
import { Fiber, dispose } from '../fiber'
import { handler, run } from '../fx'

export const withUnboundedConcurrency = <A>(spawn: (f: () => void) => A, kill: (a: A) => void) =>
  handler(function* (effect: Join<unknown> | Concurrent<unknown>) {
    if (effect instanceof Concurrent)
      return yield* async<Fiber<unknown>>((resume) => {
        const fiber = run(effect.arg)
        const spawned = spawn(() => resume(fiber))
        return () => {
          kill(spawned)
          dispose(fiber)
        }
      })
    if (effect instanceof Join)
      return yield* async<unknown>((resume) => {
        const [dispose, promise] = effect.arg
        promise.then(resume, resume)
        return dispose
      })

    return yield effect
  })
