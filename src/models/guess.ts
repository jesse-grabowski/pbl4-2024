export interface Guess {
  correct: boolean
  distance: number
  floorDiff: number
  guess: Coordinates
  time: string
  stage: string
}

export interface Coordinates {
  lat: number
  lng: number
}
