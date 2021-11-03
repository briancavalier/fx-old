import express from 'express'
import { async } from '../../../src/async'
import { Fail, fail } from '../../../src/fail'

import { promise } from '../../../src/fiber'
import { Fx, fromIO, fx, handler, run } from '../../../src/fx'
import { attempt } from '../../../src/handle/catchError'
import { withFiberAsync } from '../../../src/handle/fiberAsync'
import { withUnboundedConcurrency } from '../../../src/handle/unboundedConcurrency'
import { IPAddress } from '../application/getPetsNear'
import { GetRequest, Http, PostRequest } from '../infrastructure/http'
import { request } from '../infrastructure/http-node'
import {
  GetPetfinderConfig,
  GetPetfinderCredentials,
  PetfinderConfig,
  PetfinderCredentials
} from '../infrastructure/petfinder'
import { GetRadarConfig, RadarConfig } from '../infrastructure/radar'
import { Delay, timeout } from '../infrastructure/timeout'
import { GetEnv, getEnv } from '../lib/env'
import { pipe } from '../lib/pipe'
import { getPets } from './getPets'

type Config = {
  timeout: number
  port: number
  radar: RadarConfig
  petfinder: {
    config: PetfinderConfig
    credentials: PetfinderCredentials
  }
}

const getConfig = fx(function* () {
  const env = yield* getEnv
  return {
    timeout: env.TIMEOUT ? parseInt(env.TIMEOUT, 10) : 2000,
    port: env.PORT ? parseInt(env.PORT, 10) : 8000,
    radar: {
      baseUrl: new URL(env.RADAR_BASE_URL ?? 'https://api.radar.io/v1/'),
      apiKey: env.RADAR_API_KEY ?? (yield* failEnvVarNotSet('RADAR_API_KEY'))
    },
    petfinder: {
      config: {
        baseUrl: new URL(env.PETFINDER_BASE_URL ?? 'https://api.petfinder.com/v2/')
      },
      credentials: {
        /* eslint-disable @typescript-eslint/naming-convention */
        grant_type: 'client_credentials',
        client_id: env.PETFINDER_ID ?? (yield* failEnvVarNotSet('PETFINDER_ID')),
        client_secret: env.PETFINDER_SECRET ?? (yield* failEnvVarNotSet('PETFINDER_SECRET'))
        /* eslint-enable @typescript-eslint/naming-convention */
      }
    }
  } as const
})

const failEnvVarNotSet = (name: string) => fail(new Error(`${name} env var must be set`))

const withTimeout =
  (milliseconds: number) =>
  <Y, R>(f: Fx<Y, R>) =>
    timeout(milliseconds, f)

const handleDelay = handler(function* (effect: Delay) {
  if (effect instanceof Delay)
    return yield* async<never, void>((k) => {
      const t = setTimeout(k, effect.arg)
      return fromIO(() => clearTimeout(t))
    })

  return yield effect
})

const handleNodeConfig = handler(function* (effect: GetEnv | Fail<unknown>) {
  if (effect instanceof GetEnv) return process.env
  if (effect instanceof Fail) throw effect.arg
  return yield effect
})

const handleConfig = (config: Config) =>
  handler(function* (effect: GetRadarConfig | GetPetfinderConfig | GetPetfinderCredentials) {
    if (effect instanceof GetRadarConfig) return config.radar
    if (effect instanceof GetPetfinderConfig) return config.petfinder.config
    if (effect instanceof GetPetfinderCredentials) return config.petfinder.credentials
    return yield effect
  })

const handleHttp = handler(function* (effect: Http<GetRequest | PostRequest<unknown>, unknown>) {
  if (effect instanceof Http) return yield* request(effect.arg)
  return yield effect
})

// Force config so it fails fast on startup
const config = run(handleNodeConfig(getConfig))

const nodeGetPets = (ip: IPAddress) =>
  pipe(
    ip,
    getPets,
    withTimeout(config.timeout),
    handleDelay,
    handleConfig(config),
    handleHttp,
    attempt,
    withUnboundedConcurrency(setImmediate, clearImmediate),
    withFiberAsync
  )

express()
  .get('/', async (req, res) => {
    const ip = '71.112.150.159' as IPAddress
    // const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as IPAddress

    const result = await promise(run(nodeGetPets(ip as IPAddress)))

    return result instanceof Error ? res.status(500).send(result.stack) : res.json(result)
  })
  .listen(config.port, () => {
    console.log(`Listening on ${config.port}`)
  })
