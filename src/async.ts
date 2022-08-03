import { Effect } from './fx'

export class Async<A> extends Effect<'Async', AsyncTask<A>, A> {}

export const async = <A>(run: AsyncTask<A>) => new Async(run)

export type AsyncTask<A> = (k: (a: A) => void) => Cancel

export type Cancel = () => void
