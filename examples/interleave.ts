import { Async, AsyncTask } from '../src/async'
import { Effect, Fx, fx } from '../src/fx'
import { Fiber, FiberImpl, abort, forkFiber, isCompleted, waitNext } from './fiber'

type ConcurrencyContext = symbol
const concurrencyContext: ConcurrencyContext[] = []

export const withConcurrentHandler = <Fxs extends readonly Fx<unknown, unknown>[], Y2, R2>(
  fxs: Fxs,
  h: (irs: Status<unknown, unknown>[], contextStack: ConcurrencyContext[], myContext: ConcurrencyContext) => Fx<Y2, R2>
) => ({
  [Symbol.iterator]() {
    const irs = fxs.map(initStatus)
    const hi = h(irs, concurrencyContext, Symbol(h.name))[Symbol.iterator]()

    return {
      next(x: unknown) {
        const hir = hi.next(x)
        return hir.done ? this.return(hir.value) : hir
      },
      return(x: R2): IteratorResult<Y2, R2> {
        irs.forEach((ir) => {
          if (isWaiting(ir)) abort(ir.value, 'aborted')
          if (isWaiting(ir) || isReady(ir)) ir.i.return && ir.i.return()
        })
        return { done: true, value: x }
      }
    }
  }
})

export const all = <Fxs extends readonly Fx<unknown, unknown>[]>(
  ...fxs: Fxs
): Fx<Wait<unknown> | EffectsOf<Fxs>, ResultsOf<Fxs>> =>
  withConcurrentHandler(fxs, function* (irs, contextStack, context) {
    const n = irs.length

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let done = 0
      let ready = 0
      let waiting = 0

      for (let i = 0; i < n; i++) {
        const s = irs[i]
        if (s.status === 'done') done += 1
        else if (s.status === 'waiting') waiting += 1
        else {
          contextStack.push(context)

          const r = s.i.next(s.value)

          if (r.done) {
            irs[i] = { status: 'done', value: r.value }
            done += 1
          } else {
            const value = r.value instanceof Wait ? new Async(r.value.arg) : r.value
            const x = yield value
            if (x instanceof FiberImpl && x.context === context) {
              irs[i] = { status: 'waiting', value: x as Fiber<unknown, unknown>, i: s.i }
              waiting += 1
            } else {
              irs[i] = { status: 'ready', value: x, i: s.i }
              ready += 1
            }
          }

          contextStack.pop()
        }
      }

      if (done === n) return irs.map((r) => r.value) as unknown as ResultsOf<Fxs>

      if (ready === 0 && waiting > 0) {
        const waiting = irs.filter(isWaiting).map((w) => w.value as Fiber<unknown, unknown>)
        yield new Wait((f) => waitNext(waiting, f))
        irs = irs.map(updateStatus)
      }
    }
  }) as Fx<Wait<unknown> | EffectsOf<Fxs>, ResultsOf<Fxs>>

export class Wait<A> extends Effect<'Wait', AsyncTask<A>, A> {}

export const handleWait = <Y extends Wait<unknown>, R>(f: Fx<Y, R>): Fx<never, Fiber<R, unknown>> =>
  fx(function* () {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let _dispose = () => {}

    const stepAsync = (i: Iterator<Y, R, unknown>, ir: IteratorResult<Y, R>, resolve: (r: R) => void): void => {
      if (ir.done) return resolve(ir.value)
      _dispose = ir.value.arg((a) => stepAsync(i, i.next(a), resolve))
    }

    const i = f[Symbol.iterator]()
    const dispose = () => _dispose()
    return forkFiber((resolve) => (stepAsync(i, i.next(), resolve), dispose), Symbol())
  })

export const handleAsync = <Y, R>(f: Fx<Y, R>): Fx<Exclude<Y, Async<unknown>> | Wait<unknown>, R> =>
  fx(function* () {
    const i = f[Symbol.iterator]()
    let ir = i.next()

    while (!ir.done)
      if (ir.value instanceof Async)
        ir = i.next(
          concurrencyContext.length === 0
            ? yield* new Wait(ir.value.arg)
            : forkFiber(ir.value.arg, concurrencyContext[concurrencyContext.length - 1])
        )
      else ir = i.next(yield ir.value)

    return ir.value
  }) as Fx<Exclude<Y, Async<unknown>> | Wait<unknown>, R>

export const handleConcurrent = <Y extends Wait<unknown> | Async<unknown>, R>(
  f: Fx<Y, R>
): Fx<never, Fiber<R, unknown>> => handleWait(handleAsync(f))

type EffectsOf<Fxs extends readonly Fx<unknown, unknown>[]> = Effects<Fxs[number]>
type Effects<F> = F extends Fx<infer Y, unknown> ? Y : never
type ResultsOf<Fxs extends readonly Fx<unknown, unknown>[]> = {
  [K in keyof Fxs]: Fxs[K] extends Fx<unknown, infer R> ? R : never
}

type Status<Y, R> = Done<R> | Ready<Y, R> | Waiting<Y, R>

type Done<R> = { status: 'done'; value: R }
type Ready<Y, R> = { status: 'ready'; value: Y; i: Iterator<Y, R, unknown> }
type Waiting<Y, R> = { status: 'waiting'; value: Fiber<unknown, unknown>; i: Iterator<Y, R, unknown> }

const isWaiting = <Y, R>(s: Status<Y, R>): s is Waiting<Y, R> => s.status === 'waiting'

const isReady = <Y, R>(s: Status<Y, R>): s is Ready<Y, R> => s.status === 'ready'

const initStatus = <F extends Fx<unknown, unknown>>(f: F): Status<unknown, unknown> => ({
  status: 'ready',
  i: f[Symbol.iterator](),
  value: undefined
})

const updateStatus = <S extends Status<unknown, unknown>>(s: S): Status<unknown, unknown> =>
  isWaiting(s) && isCompleted(s.value) ? { status: 'ready', value: s.value.state.value, i: s.i } : s

// const race = <Fxs extends readonly Fx<unknown, unknown>[]>(
//   ...fxs: Fxs
// ): Fx<Wait<unknown> | EffectsOf<Fxs>, ResultsOf<Fxs>[keyof Fxs]> =>
//   fx(function* () {
//     const n = fxs.length
//     let irs: Status<unknown, unknown>[] = fxs.map((f) => ({
//       status: 'ready',
//       i: f[Symbol.iterator](),
//       value: undefined
//     }))

//     // eslint-disable-next-line no-constant-condition
//     while (true) {
//       let ready = 0
//       let waiting = 0

//       for (let j = 0; j < n; j++) {
//         const s = irs[j]
//         if (s.status === 'waiting') waiting += 1
//         else if (s.status === 'ready') {
//           const r = s.i.next(s.value)
//           if (r.done) {
//             irs.forEach((ir) => ir.status === 'waiting' && isActive(ir.value) && abort(ir.value, undefined))
//             return r.value
//           } else {
//             const x = yield r.value
//             if (x instanceof FiberImpl) {
//               irs[j] = { status: 'waiting', value: x as Fiber<unknown, unknown>, i: s.i }
//               waiting += 1
//             } else {
//               irs[j] = { status: 'ready', value: x, i: s.i }
//               ready += 1
//             }
//           }
//         }
//       }

//       // console.log(done, ready, waiting, irs)

//       // if (done === n) return irs.map((r) => r.value) as unknown as ResultsOf<Fxs>
//       if (ready === 0 && waiting > 0) {
//         const w = irs.filter((w) => w.status === 'waiting').map((w) => w.value as Fiber<unknown, unknown>)
//         yield* new Wait((f) => waitNext(w, f))
//         irs = irs.map((s) =>
//           s.status === 'waiting'
//             ? isCompleted(s.value)
//               ? { status: 'ready', value: s.value.state.value, i: s.i }
//               : s
//             : s
//         )
//       }
//     }
//   }) as Fx<EffectsOf<Fxs>, ResultsOf<Fxs>[keyof Fxs]>

// const timeout = <Y, R>(ms: number, f: Fx<Y, R>) =>
//   race(
//     f,
//     fx(function* () {
//       console.log('timeout start', ms)
//       yield* new Delay(ms)
//       yield* fail(undefined)
//       console.log('timeout fired', ms)
//     })
//   )
