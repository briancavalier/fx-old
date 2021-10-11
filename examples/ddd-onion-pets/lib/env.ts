import { Effect } from '../../../src/fx'

export type Env = {
  [key: string]: string
}

export class GetEnv extends Effect<void, Env> {}

export const getEnv = new GetEnv()
