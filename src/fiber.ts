import { Dispose } from './async'

export type Fiber<A> = [Dispose, Promise<A>]

export const dispose = <A>([dispose]: Fiber<A>): void => dispose()

export const promise = <A>([, promise]: Fiber<A>): Promise<A> => promise
