import { Effect, fx } from '../../../src/fx'
import { Location, Pet } from '../domain/pets'

export type IPAddress = string & { _type: 'IPAddress' }

export class GetLocation extends Effect<IPAddress, Location> {}
export const getLocation = (ip: IPAddress): GetLocation => new GetLocation(ip)

export class GetPets extends Effect<Location, readonly Pet[]> {}
export const getPets = (l: Location): GetPets => new GetPets(l)

export const getPetsNear = (ip: IPAddress) =>
  fx(function* () {
    const location = yield* getLocation(ip)
    return yield* getPets(location)
  })
