import { race } from '../../../src/concurrent'
import { fail } from '../../../src/fail'
import { Effect, Fx, fx } from '../../../src/fx'

export class Delay extends Effect<number, void> {}

export const timeout = <Y, R>(milliseconds: number, f: Fx<Y, R>) =>
  race(
    f,
    fx(function* () {
      yield* new Delay(milliseconds)
      yield* fail(new Error(`timeout: ${milliseconds} ms`))
    })
  )
