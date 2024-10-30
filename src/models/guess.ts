export interface Guess {
  correct: boolean
  distance: number
  floorDiff: number
  guessedCoordinate: google.maps.LatLngLiteral
  time: string
  stage: string
}
