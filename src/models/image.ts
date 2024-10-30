import type { Coordinates } from './coordinates'
export interface Image {
  title: string
  description: string
  url: string
  isPanorama: boolean
  coordinate: Coordinates
  floor: number
  haov: number
  vaov: number
}
