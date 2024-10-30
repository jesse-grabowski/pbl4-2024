import type { Coordinates } from './coordinates'

export interface Guess {
  correct: boolean
  distance: number
  floorDiff: number
  guess: Coordinates
  time: string
  stage: string
}
