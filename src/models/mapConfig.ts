export interface MapConfig {
  apikey: string
  center: google.maps.LatLngLiteral
  zoomcontrol: boolean
  maptypecontrol: boolean
  streetviewcontrol: boolean
  map_styles: google.maps.MapTypeStyle[]
  zoom: number
  mapTypeId: string
  tilt: number
}
