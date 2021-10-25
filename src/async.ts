import { Effect } from './fx'

export class Async<A> extends Effect<Task<A>, A> {}

export const async = <A>(t: Task<A>): Async<A> => new Async(t)

export type Task<A> = (k: (a: A) => void) => Dispose

export type Dispose = () => void

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const disposeNone = () => {}
