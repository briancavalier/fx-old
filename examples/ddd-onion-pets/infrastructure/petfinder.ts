import { Effect, fx } from '../../../src/fx'
import { Location } from '../domain/pets'
import { get, post } from './http'

export type PetfinderConfig = {
  baseUrl: URL
}

export type PetfinderCredentials = {
  /* eslint-disable @typescript-eslint/naming-convention */
  grant_type: 'client_credentials'
  client_id: string
  client_secret: string
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type PetfinderToken = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_token: string
}

export type PetfinderPets = {
  animals: ReadonlyArray<{
    name: string
    url: string
    photos: ReadonlyArray<{
      medium?: string
    }>
  }>
}

export class GetPetfinderToken extends Effect<void, PetfinderToken> {}

export class GetPetfinderCredentials extends Effect<void, PetfinderCredentials> {}

export class GetPetfinderConfig extends Effect<void, PetfinderConfig> {}

export const getPetfinderPets = (l: Location) =>
  fx(function* () {
    const { baseUrl } = yield* new GetPetfinderConfig()
    const token = yield* new GetPetfinderToken()

    const { animals } = yield* get<PetfinderPets>(
      new URL(`animals?location=${l.latitude},${l.longitude}&distance=10`, baseUrl),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      { Authorization: `Bearer ${token.access_token}` }
    )

    return animals.map(({ name, url, photos }) => ({ name, url, photoUrl: photos[0]?.medium }))
  })

export const getPetfinderToken = fx(function* () {
  const { baseUrl } = yield* new GetPetfinderConfig()
  const credentials = yield* new GetPetfinderCredentials()

  return yield* post<
    PetfinderCredentials,
    PetfinderToken
  >(new URL(`oauth2/token`, baseUrl), credentials)
})
