<script setup lang="ts">
import { GoogleMap, Marker } from 'vue3-google-map'
import { Chance } from 'chance'
import ImageData from '@/data/image-data'
import DynamicImage from '@/components/DynamicImage.vue'
import { useModal } from 'vue-final-modal'
import GuessResultsModal from '@/components/GuessResultsModal.vue'
import type { Guess, Coordinates } from '@/models/guess'
import type { MapConfig } from '@/models/mapConfig'

const images: Image[] = ImageData
const guessedImageSet = new Set<number>()

// we need to include the width and height as hints for the browser to reserve enough space
const image = ref<Image | undefined>(undefined)

const timer = ref(0)
const timerText = ref('10:00')
const guessCount = ref(0)
const stageText = computed(() => `${guessCount.value} / 10`)
const roundScore = ref(0)
const totalScore = ref(0)

const distance = ref(0)
const selectedFloor = ref('1F')
const floorDiff = ref(0)
const result = ref(false)
const correctFloor = ref(false)
const score_boundary = ref(400) // temporary

const apikey = 'AIzaSyCcQMDjEPrA9cCZAHQfPW1n47H4r5Bx4EI'
const OIC_COORD = { lat: 34.81027686919236, lng: 135.56099624838777 }
const zoomcontrol = false
const maptypecontrol = false
const streetviewcontrol = false
const initialZoom = 16
const currentZoom = ref(initialZoom)
const mapTypeId = 'satellite'
const map_styles = [
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
]
// let marker_position = OIC_COORD
let marker_position = { lat: 0, lng: 0 }
let actual_position = { lat: 0, lng: 0 }
const marker_option = ref({ position: marker_position })
const mapExpanded = ref(false)

function toggleMapExpansionZoom() {
  if (mapExpanded.value) {
    currentZoom.value += 1.4
  } else {
    currentZoom.value -= 1.4
  }
}

function start_timer() {
  timer.value = 600;
  const interval = setInterval(() => {
    if (timer.value > 0) {
      timer.value--;
      const minutes = Math.floor(timer.value / 60);
      const seconds = timer.value % 60;
      timerText.value = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
      clearInterval(interval);
    }
  }, 1000);
}

function evaluate(){
  floorDiff.value = (Math.abs(Number(selectedFloor.value[0]) - Number(image.value?.floor)))
  distance.value = getDistance() + 10 * floorDiff.value
  if(distance.value == 0){
    roundScore.value = 5000
  }
  else{
    roundScore.value = 1/distance.value * 10000
  }

  console.log("round score: ", roundScore.value)

  totalScore.value += roundScore.value

  if(floorDiff.value == 0){
    correctFloor.value = true
  } else correctFloor.value = false

  if(roundScore.value > score_boundary.value && correctFloor.value){
    result.value = true
  } else result.value = false

  console.log(result.value)

  if(guessCount.value == 10){
    totalScore.value *= totalScore.value
  }
}

function getDistance() {
    const R = 6371000; // Radius of the Earth in meters
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const dLat = toRadians(marker_position.lat - (actual_position.lat));
    const dLon = toRadians(marker_position.lng - (actual_position.lng));

    const lat1 = toRadians(actual_position.lat);
    const lat2 = toRadians(marker_position.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = Math.floor(R * c); // Distance in meters
    return distance;
}

function updateMarkerPosition(event: google.maps.MapMouseEvent) {
  marker_position = {
    lat: event.latLng?.lat() || 0,
    lng: event.latLng?.lng() || 0,
  }
  marker_option.value = {
    ...marker_option.value,
    position: marker_position,
  }
}

const guess = computed<Guess | undefined>(() => {
  return {
    correct: result.value,
    distance: distance.value,
    time: timerText.value,
    stage: stageText.value,
    guess: marker_position,
    floorDiff: floorDiff.value
  }
})

const mapConfig = computed<MapConfig | undefined>(() => {
  return {
    apikey: apikey,
    center: {
      lat: (marker_position.lat + actual_position.lat) / 2,
      lng: (marker_position.lng + actual_position.lng) / 2,
    },
    zoomcontrol: zoomcontrol,
    maptypecontrol: maptypecontrol,
    streetviewcontrol: streetviewcontrol,
    map_styles: map_styles,
    zoom: currentZoom.value,
    mapTypeId: 'satellite',
    tilt: 0,
  }
})

const { open, close } = useModal({
  component: GuessResultsModal,
  attrs: {
    image: image,
    guess: guess,
    mapConfig: mapConfig,
    onConfirm() {
      close()
    },
    onClosed() {
      mapExpanded.value = false
      getRandomImage()
    },
  },
})

async function doGuess() {
  if(marker_position.lat === 0 && marker_position.lng === 0){
    return
  } // disable guess when marker not moved
  evaluate()
  open()
}


async function getRandomImage() {
  // a temp return for now because we don't have enough images, after getting 10+ images we can remove this if statement
  if (guessedImageSet.size === images.length) {
    return
  }
  let randomInt
  do {
    randomInt = Chance().integer({ min: 0, max: images.length - 1 })
  } while (guessedImageSet.has(randomInt))
  image.value = images[randomInt]
  actual_position = image.value.coordinate
  guessCount.value++
  guessedImageSet.add(randomInt)
}

onMounted(async () => {
  await getRandomImage()
  start_timer()
})
</script>

<template>
  <div class="game">
    <DynamicImage class="image-container" :image="image" />
    <div class="timer game-control" v-text="timerText"></div>
    <div class="stage game-control" v-text="stageText"></div>
    <button class="guess game-control" @click="doGuess">Guess</button>
    <select class="floor game-control" v-model="selectedFloor">
      <option>1F</option>
      <option>2F</option>
      <option>3F</option>
    </select>
    <div class="map-holder">
      <!-- this needs to be here to make the map a circle, don't ask -->
    </div>
    <div class="map-container">
      <div class="map-border">
        <GoogleMap
          class="map"
          :center="OIC_COORD"
          :api-key="apikey"
          :styles="map_styles"
          :zoom-control="zoomcontrol"
          :map-type-control="maptypecontrol"
          :street-view-control="streetviewcontrol"
          :zoom="currentZoom"
          :mapTypeId="mapTypeId"
          :tilt="0"
          @click="updateMarkerPosition"
        >
          <Marker id="marker" :options="marker_option" />
        </GoogleMap>
      </div>
      <label class="map-expanded">
        <v-icon v-if="mapExpanded" name="fa-compress-arrows-alt" scale="2" />
        <v-icon v-if="!mapExpanded" name="fa-expand-arrows-alt" scale="2" />
        <input type="checkbox" v-model="mapExpanded" @change="toggleMapExpansionZoom" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.game {
  flex-grow: 1;
  background-color: aliceblue;

  display: grid;
  transition: 300ms;
  grid-template-columns: 12rem 1fr auto 1fr 0fr 12rem 12rem;
  grid-template-rows: 4.5rem 1fr 0fr min-content 4.5rem;
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.game:has(.map-expanded input:checked) {
  grid-template-columns: 12rem 1fr auto 0fr 1fr 12rem 12rem;
  grid-template-rows: 4.5rem 0fr 1fr min-content 4.5rem;
}

.image-container {
  grid-row: 1/-1;
  grid-column: 1/-1;
}

.game-control {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 25px;
  padding: 10px 40px;
  margin: 10px;
  z-index: 1;

  font-weight: bold;
  font-size: 1.25rem;
  text-align: center;
}

.game-control:focus {
  outline: none;
}

.timer {
  grid-row: 1;
  grid-column: 1;
}

.stage {
  grid-row: 1;
  grid-column: 7;
}

.guess {
  grid-row: 5;
  grid-column: 6;
}

.floor {
  grid-row: 5;
  grid-column: 7;
}

.map-holder {
  grid-column: 6/-1;
  grid-row: 4;
  aspect-ratio: 1/1;
  width: 100%;
}

.map-container {
  position: relative;
  margin: 5px;
  grid-column: 5/-1;
  grid-row: 3/5;

  &:has(.map-expanded input:checked) .map-border {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }

  &:has(.map-expanded input:checked) .map {
    clip-path: polygon(5px 5px, calc(100% - 5px) 5px, calc(100% - 5px) calc(100% - 5px), 5px calc(100% - 5px));
  }
}

.map {
  height: 100%;
  width: 100%;
  clip-path: circle(calc(50% - 5px) at center);
}

.map-border {
  height: 100%;
  width: 100%;
  background-color: darkgray;
  clip-path: circle(50% at center);
}

.map-expanded {
  position: absolute;
  margin-left: -25px;
  margin-top: -25px;
  top: 0;
  left: 0;
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;

  & input {
    position: absolute;
    opacity: 0;
  }
}
</style>
