import { disposeNone } from '../async'
import { Concurrent } from '../concurrent'
import { Fiber } from '../fiber'
import { Fx, defer, handler, run } from '../fx'

export const withUnboundedConcurrency = <A>(spawn: (f: () => void) => A, kill: (a: A) => void) =>
  handler(function* (effect: Concurrent<unknown, unknown>) {
    if (effect instanceof Concurrent) return spawnFiber(spawn, kill, effect.arg)
    return yield effect
  })

const spawnFiber = <D, A, B>(
  spawn: (f: () => void) => A,
  kill: (a: A) => void,
  f: Fx<never, Fiber<D, B>>
): Fiber<D, B> => {
  let spawned: A
  let _dispose: Fx<D, void> = disposeNone

  const p = new Promise<B>((resolve) => {
    spawned = spawn(() => {
      const [dispose, promise] = run(f)
      _dispose = dispose
      resolve(promise)
    })
  })

  return [defer(() => (kill(spawned), _dispose)), p]
}
