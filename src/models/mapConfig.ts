import type { Coordinates } from './coordinates'

export interface MapConfig {
  apikey: string
  center: Coordinates
  zoomcontrol: boolean
  maptypecontrol: boolean
  streetviewcontrol: boolean
  map_styles: google.maps.MapTypeStyle[]
  zoom: number
  mapTypeId: string
  tilt: number
}
