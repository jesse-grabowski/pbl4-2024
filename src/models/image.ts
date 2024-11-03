export interface Image {
  title: string
  description: string
  url: string
  isPanorama: boolean
  coordinate: google.maps.LatLngLiteral
  floor: number
  haov: number
  vaov: number
}
