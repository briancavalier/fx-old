import { disposeNone } from '../async'
import { Concurrent } from '../concurrent'
import { Fiber, dispose, flatten, runTask } from '../fiber'
import { Fx, handler, run } from '../fx'

export const withUnboundedConcurrency = <A>(spawn: (f: () => void) => A, kill: (a: A) => void) =>
  handler(function* (effect: Concurrent<unknown>) {
    if (effect instanceof Concurrent) return flatten<unknown>(spawnTask(spawn, kill, effect.arg))
    return yield effect
  })

const spawnTask = <A, B>(spawn: (f: () => void) => A, kill: (a: A) => void, f: Fx<never, Fiber<B>>): Fiber<Fiber<B>> =>
  runTask((resume) => {
    let _dispose = disposeNone
    const spawned = spawn(() => {
      const fiber = run(f)
      _dispose = () => dispose(fiber)
      resume(fiber)
    })
    _dispose = () => kill(spawned)
    return () => _dispose()
  })
