import { fail } from '../../../src/fail'
import { Effect, fx } from '../../../src/fx'
import { IPAddress } from '../application/getPetsNear'
import { Location } from '../domain/pets'
import { get } from './http'

export type RadarIPGeocodeResult = {
  address: RadarAddress
}

export type RadarAddress = {
  city: string
  state: string
  latitude: number
  longitude: number
}

export type RadarConfig = {
  baseUrl: URL
  apiKey: string
}

export class GetRadarConfig extends Effect<void, RadarConfig> {}

export const getIPAddressLocation = (ip: IPAddress) =>
  fx(function* () {
    const { baseUrl, apiKey } = yield* new GetRadarConfig()

    const result = yield* get<RadarIPGeocodeResult>(
      new URL(`geocode/ip?ip=${ip}`, baseUrl),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      { Authorization: apiKey }
    )

    return decodeLocation(result) ?? (yield* fail(new Error(`Could not resolve location: ${ip}`)))
  })

const decodeLocation = ({ address: { latitude, longitude, city, state } }: RadarIPGeocodeResult): Location | null =>
  city ? { latitude, longitude, city, state } : null
