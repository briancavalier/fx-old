import { handler } from '../../../src/fx'
import { GetLocation, GetPets, IPAddress, getPetsNear } from '../application/getPetsNear'
import { GetPetfinderToken, getPetfinderPets, getPetfinderToken } from '../infrastructure/petfinder'
import { getIPAddressLocation } from '../infrastructure/radar'
import { pipe } from '../lib/pipe'

const handleGetPetsNear = handler(function* (effect: GetLocation | GetPets) {
  if (effect instanceof GetLocation) return yield* getIPAddressLocation(effect.arg)
  if (effect instanceof GetPets) return yield* getPetfinderPets(effect.arg)
  return yield effect
})

const handlePetfinderAuth = handler(function* (effect: GetPetfinderToken) {
  if (effect instanceof GetPetfinderToken) return yield* getPetfinderToken
  return yield effect
})

export const getPets = (ip: IPAddress) => pipe(ip, getPetsNear, handleGetPetsNear, handlePetfinderAuth)
