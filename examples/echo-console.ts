import { EOL } from 'os'
import { createInterface } from 'readline'

import { async } from '../src/async'
import { fork } from '../src/fiber'
import { Effect, fx, handle, run } from '../src/fx'

//---------------------------------------------------------------
// effects
// Note that Read and Print have no implementation
// They only represent a signature.  For example, Read represents
// the signature void -> string, i.e. it produces a string out of
// nowhere. Print represents the signature string -> void, i.e.
// it consumes a string.

class Read extends Effect<void, string> {}

const read = new Read()

class Print extends Effect<string, void> {}

const print = (s: string): Print => new Print(s)

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
  }
})

//---------------------------------------------------------------
// effect handler
// This handler handles the Print and Read effects. It handles
// Print by simply printing the string to process.stdout.
// However, it handles Read by introducing *another effect*,
// in this case, Async, to read a line asynchronously from
// process.stdin.
// So, handled still isn't runnable.  We need to handle the
// Async effect that this handler introduced.
const handled = handle(main, function* (effect) {
  if (effect instanceof Print) return process.stdout.write(effect.arg)

  if (effect instanceof Read)
    return yield* async<string>((k) => {
      const handler = (s: string) => {
        readline.close()
        k(s)
      }
      const readline = createInterface({ input: process.stdin }).once('line', handler)
      return () => readline.removeListener('line', handler).close()
    })

  return yield effect
})

// Finally, we can handle the Async effect using the
// provided fork effect handler.
const runnable = fork(handled)

// Since runnable produces no effects, we can run it.
run(runnable)
