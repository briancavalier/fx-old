import { Effect, Fx, pure } from './fx'

export class Async<D, A> extends Effect<'Async', Task<D, A>, A> {}

export const async = <D, A>(t: Task<D, A>): Async<D, A> => new Async(t)

export type Task<D, A> = (k: (a: A) => void) => Fx<D, void>

export const disposeNone: Fx<never, void> = pure(undefined)
