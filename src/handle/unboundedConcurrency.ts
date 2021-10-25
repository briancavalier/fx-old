import { disposeNone } from '../async'
import { Concurrent } from '../concurrent'
import { Fiber, dispose, flatten, runTask } from '../fiber'
import { Fx, defer, fromIO, handler, run } from '../fx'

export const withUnboundedConcurrency = <A>(spawn: (f: () => void) => A, kill: (a: A) => void) =>
  handler(function* (effect: Concurrent<unknown, unknown>) {
    if (effect instanceof Concurrent) return flatten<unknown, unknown, unknown>(spawnTask(spawn, kill, effect.arg))
    return yield effect
  })

const spawnTask = <D1, A, B>(
  spawn: (f: () => void) => A,
  kill: (a: A) => void,
  f: Fx<never, Fiber<D1, B>>
): Fiber<D1, Fiber<D1, B>> =>
  runTask((resume) => {
    let _dispose: Fx<D1, void> = disposeNone

    const spawned = spawn(() => {
      const fiber = run(f)
      _dispose = dispose(fiber)
      resume(fiber)
    })

    _dispose = fromIO(() => kill(spawned))

    return defer(() => _dispose)
  })
