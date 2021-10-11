export type Pet = {
  readonly name: string
  readonly url: string
  readonly photoUrl?: URL
}

export type Location = {
  readonly longitude: number
  readonly latitude: number
  readonly city: string
  readonly state: string
}
