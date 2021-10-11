import { Effect } from './fx'

export class Fail<E> extends Effect<E, never> {
  *[Symbol.iterator](): Iterator<this, never, unknown> {
    yield this
    throw this.arg // ensure result type is never
  }
}

export const fail = <E>(reason: E): Fail<E> => new Fail(reason)
