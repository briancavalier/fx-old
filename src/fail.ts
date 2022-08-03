import { Effect } from './fx'

export class Fail<E> extends Effect<'Fail', E, never> {
  *[Symbol.iterator](): Iterator<this, never, unknown> {
    yield this
    throw this
  }
}

export const fail = <E>(reason: E): Fail<E> => new Fail(reason)
