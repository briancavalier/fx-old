import { Async, async, disposeNone } from './async'
import { Fail, fail } from './fail'
import { Fx, fx } from './fx'

type PromiseResult<A, E> = { ok: true; value: A } | { ok: false; value: E }

export function fromPromise<A, E = Error>(f: () => Promise<A>): Fx<Async<never, PromiseResult<A, E>> | Fail<E>, A> {
  return fx(function* () {
    const x = yield* async<never, PromiseResult<A, E>>((k) => {
      f().then(
        (value) => k({ ok: true, value }),
        (value) => k({ ok: false, value })
      )
      return disposeNone
    })

    return x.ok ? x.value : yield* fail(x.value)
  })
}
