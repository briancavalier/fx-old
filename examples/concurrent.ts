import { async } from '../src/async'
import { fail } from '../src/fail'
import { Effect, fx, handler, run } from '../src/fx'
import { attempt } from '../src/handle/catchError'
import { wait } from './fiber'
import { all, handleAsync, handleWait } from './interleave'

class Delay extends Effect<'Delay', number, void> {}

const handleDelay = handler(function* (effect: Delay) {
  if (effect instanceof Delay)
    return yield* async<void>((resume) => {
      const t = setTimeout(resume, effect.arg)
      return () => clearTimeout(t)
    })

  return yield effect
})

class Print extends Effect<'Print', string, void> {}

const handlePrint = handler(function* (p: Print) {
  if (p instanceof Print) return console.log(p.arg)
  return yield p
})

const main = <N extends string>(i: number, name: N) =>
  fx(function* () {
    // while (true) {
    yield* new Print(`${name} 1`)
    // console.log('delay start', i)
    yield* new Delay(i)
    // console.log('delay end', i)
    yield* new Print(`${name} 2`)

    yield* fail(new Error('error'))
    // }
    return name
  })

const start = Date.now()
const a = main(2000, 'a')
const b = main(1000, 'b')
const c = main(3000, 'c')
const d = main(1000, 'd')
const e = main(1000, 'e')

// const f = race(a, b, c)
// const f = all(all(b))
const f = all(a, b, all(all(c, d), e))
// const f = all(a, b, c)

// const f = a
const f0 = handleDelay(handlePrint(f))
const f1 = attempt(f0)
const f2 = handleAsync(f1)
const f3 = handleWait(f2)
const r = run(f3)
wait(r, (x) => console.log(Date.now() - start, x))
