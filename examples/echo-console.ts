import { EOL } from 'os'
import { createInterface } from 'readline'
import { async } from '../src/async'

import { Effect, fx, handler, run } from '../src/fx'
import { handleConcurrent } from './interleave'

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
  }
})

//---------------------------------------------------------------
// effect handler
// This handler handles the Print and Read effects. It handles
// Print by simply printing the string to process.stdout.
// However, it handles Read by introducing *another effect*,
// Async, to read a line from process.stdin.
const handle = handler(function* (effect: Print | Read) {
  if (effect instanceof Print) return void process.stdout.write(effect.arg)

  if (effect instanceof Read) {
    return yield* async<string>((resume) => {
      const handler = (s: string) => {
        readline.close()
        resume(s)
      }
      const readline = createInterface({ input: process.stdin }).once('line', handler)
      return () => readline.removeListener('line', handler).close()
    })
  }

  return yield effect
})

// Handle the Print and Read effects
const h1 = handle(main)

// h1 still isn't runnable because the handler introduced
// the Async effect.  We need to handle that effect first.
const runnable = handleConcurrent(h1)

// Since runnable produces no effects, we can run it.
run(runnable)
