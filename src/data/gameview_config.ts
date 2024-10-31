export const CONFIG = {
  timerText: ref('30'),
  distance: ref(0),
  selectedFloor: ref('1F'),
  score_boundary: ref(400),
  apikey: 'AIzaSyCcQMDjEPrA9cCZAHQfPW1n47H4r5Bx4EI',
  OIC_COORD: { lat: 34.81027686919236, lng: 135.56099624838777 },
  zoomcontrol: false,
  maptypecontrol: false,
  streetviewcontrol: false,
  initialZoom: 16,
  mapTypeId: 'satellite',
  map_styles: [
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'administrative',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }],
    },
  ],
  mapExpanded: ref(false),
}
