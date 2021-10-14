import express from 'express'
import { Fail, fail } from '../../../src/fail'

import { forkFiber, promise } from '../../../src/fiber'
import { fx, handler, run } from '../../../src/fx'
import { IPAddress } from '../application/getPetsNear'
import { GetRequest, Http, PostRequest } from '../infrastructure/http'
import { request } from '../infrastructure/http-node'
import { GetPetfinderConfig, GetPetfinderCredentials } from '../infrastructure/petfinder'
import { GetRadarConfig } from '../infrastructure/radar'
import { attempt } from '../lib/catchError'
import { GetEnv, getEnv } from '../lib/env'
import { pipe } from '../lib/pipe'
import { getPets } from './getPets'

const getConfig = fx(function* () {
  const env = yield* getEnv
  return {
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
  }
})

const failEnvVarNotSet = (name: string) => fail(new Error(`${name} env var must be set`))

const handleNodeConfig = handler(function* (effect: GetEnv | Fail<unknown>) {
  if (effect instanceof GetEnv) return process.env
  if (effect instanceof Fail) throw effect.arg
  return yield effect
})

const config = run(pipe(getConfig, handleNodeConfig))

const handleConfig = handler(function* (effect: GetRadarConfig | GetPetfinderConfig | GetPetfinderCredentials) {
  if (effect instanceof GetRadarConfig) return config.radar
  if (effect instanceof GetPetfinderConfig) return config.petfinder.config
  if (effect instanceof GetPetfinderCredentials) return config.petfinder.credentials
  return yield effect
})

const handleHttp = handler(function* (effect: Http<GetRequest | PostRequest<unknown>, unknown>) {
  if (effect instanceof Http) return yield* request(effect.arg)
  return yield effect
})

const nodeExpressGetPets = (ip: IPAddress) => pipe(ip, getPets, handleConfig, handleHttp, attempt, forkFiber)

express()
  .get('/', async (req, res) => {
    const ip = '71.112.150.159' as IPAddress
    // const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as IPAddress

    const result = await promise(run(nodeExpressGetPets(ip as IPAddress)))

    return result instanceof Error ? res.status(500).send(result.stack) : res.json(result)
  })
  .listen(8080, () => {
    console.log(`Listening on ${8080}`)
  })
