import { EOL } from 'os'
import { createInterface } from 'readline'
import { async } from '../src/async'

import { Effect, Fx, FxInternal, fx, run } from '../src/fx'
import { fork, promise } from '../src/handle/fork'

//---------------------------------------------------------------
// effects
// Note that Read and Print have no implementation
// They only represent a signature.  For example, Read represents
// the signature void -> string, i.e. it produces a string out of
// nowhere. Print represents the signature string -> void, i.e.
// it consumes a string.

class Read extends Effect<'Read', void, string> {}

const read = new Read()

class Print extends Effect<'Print', string, void> {}

const print = (s: string) => new Print(s)

//---------------------------------------------------------------
// main program
// It does what it says: loops forever, `Read`ing strings and then
// `Print`ing them.  Remember, though, that Read and Print have
// no meaning.
// The program cannot be run until all its effects have been
// assigned a meaning, which is done by applying effect handlers
// to main for its effects, Read and Print.

const main = fx(function* () {
  while (true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
    // yield* fail(new Error())
  }
})

//---------------------------------------------------------------
// effect handler
// This handler handles the Print and Read effects. It handles
// Print by simply printing the string to process.stdout.
// However, it handles Read by introducing *another effect*,
// Async, to read a line from process.stdin.
// const handle1 = handler1(function* (effect: Print | Read) {
//   // return done(1)
//   if (effect instanceof Print) return resume(void process.stdout.write(effect.arg))

//   if (effect instanceof Read) {
//     return resume(
//       yield* async<string>((resume) => {
//         const handler = (s: string) => {
//           readline.close()
//           resume(s)
//         }
//         const readline = createInterface({ input: process.stdin }).once('line', handler)
//         return () => readline.removeListener('line', handler).close()
//       })
//     )
//   }

//   return unhandled
// })

type Context<Y, R, A> = [Iterator<Y, R, A>, IteratorYieldResult<Y> | IteratorReturnResult<R>]
type ContextReturn<Y, R, A> = [Iterator<Y, R, A>, IteratorReturnResult<R>]
type ContextYield<Y, R, A> = [Iterator<Y, R, A>, IteratorYieldResult<Y>]

const effects = <Y, R, A>(f: FxInternal<Y, R, A>): Context<Y, R, A> => {
  const i = f[Symbol.iterator]()
  return [i, i.next()]
}

const resume = <Y, R, A>([i]: Context<Y, R, A>, a: A): Context<Y, R, A> => [i, i.next(a)]

const done = <Y, R, A>(c: Context<Y, R, A>): c is ContextReturn<Y, R, A> => !!c[1].done
const value = <Y, R, A>(c: ContextYield<Y, R, A>): Y => c[1].value
const result = <Y, R, A>(c: ContextReturn<Y, R, A>): R => c[1].value

const handle = <Y, R>(f: Fx<Y, R>) =>
  fx(function* () {
    let c = effects(f)
    while (!done(c)) {
      const effect = value(c)
      if (effect instanceof Print) c = resume(c, void process.stdout.write(effect.arg))

      if (effect instanceof Read) {
        c = resume(
          c,
          yield* async<string>((resume) => {
            const handler = (s: string) => {
              readline.close()
              resume(s)
            }
            const readline = createInterface({ input: process.stdin }).once('line', handler)
            return () => readline.removeListener('line', handler).close()
          })
        )
      }
    }

    return result(c)
  })

// const handled = handler2(main, function* (effect, resume) {
//   if (effect instanceof Print) return yield* resume(void process.stdout.write(effect.arg))

//   if (effect instanceof Read) {
//     return yield* resume(
//       yield* async<string>((resume) => {
//         const handler = (s: string) => {
//           readline.close()
//           resume(s)
//         }
//         const readline = createInterface({ input: process.stdin }).once('line', handler)
//         return () => readline.removeListener('line', handler).close()
//       })
//     )
//   }

//   return yield* resume(yield effect)
// })

// So, handled still isn't runnable.  We need to handle the
// Async effect that this handler introduced.

// Finally, we can handle the Async effect.
const h1 = handle(main)
const runnable = fork(h1)

// Since runnable produces no effects, we can run it.
const fiber = run(runnable)
promise(fiber).then(console.log)
// abort(fiber, 'because')
