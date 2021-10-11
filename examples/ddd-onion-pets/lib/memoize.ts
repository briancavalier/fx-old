import { Fx, fx } from '../../../src/fx'

export const memoize = <Y, R>(f: Fx<Y, R>): Fx<Y, R> => {
  let memo: undefined | { value: R }
  return fx(function* () {
    if (!memo) memo = { value: yield* f }
    return memo.value
  })
}
