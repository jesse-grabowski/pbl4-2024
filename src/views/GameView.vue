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
  transition: 600ms;
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
    clip-path: polygon(calc(0.00% + 0.00px) calc(0.00% + 0.00px), calc(1.11% + 0.00px) calc(0.00% + 0.00px), calc(2.22% + 0.00px) calc(0.00% + 0.00px), calc(3.33% + 0.00px) calc(0.00% + 0.00px), calc(4.44% + 0.00px) calc(0.00% + 0.00px), calc(5.56% + 0.00px) calc(0.00% + 0.00px), calc(6.67% + 0.00px) calc(0.00% + 0.00px), calc(7.78% + 0.00px) calc(0.00% + 0.00px), calc(8.89% + 0.00px) calc(0.00% + 0.00px), calc(10.00% + 0.00px) calc(0.00% + 0.00px), calc(11.11% + 0.00px) calc(0.00% + 0.00px), calc(12.22% + 0.00px) calc(0.00% + 0.00px), calc(13.33% + 0.00px) calc(0.00% + 0.00px), calc(14.44% + 0.00px) calc(0.00% + 0.00px), calc(15.56% + 0.00px) calc(0.00% + 0.00px), calc(16.67% + 0.00px) calc(0.00% + 0.00px), calc(17.78% + 0.00px) calc(0.00% + 0.00px), calc(18.89% + 0.00px) calc(0.00% + 0.00px), calc(20.00% + 0.00px) calc(0.00% + 0.00px), calc(21.11% + 0.00px) calc(0.00% + 0.00px), calc(22.22% + 0.00px) calc(0.00% + 0.00px), calc(23.33% + 0.00px) calc(0.00% + 0.00px), calc(24.44% + 0.00px) calc(0.00% + 0.00px), calc(25.56% + 0.00px) calc(0.00% + 0.00px), calc(26.67% + 0.00px) calc(0.00% + 0.00px), calc(27.78% + 0.00px) calc(0.00% + 0.00px), calc(28.89% + 0.00px) calc(0.00% + 0.00px), calc(30.00% + 0.00px) calc(0.00% + 0.00px), calc(31.11% + 0.00px) calc(0.00% + 0.00px), calc(32.22% + 0.00px) calc(0.00% + 0.00px), calc(33.33% + 0.00px) calc(0.00% + 0.00px), calc(34.44% + 0.00px) calc(0.00% + 0.00px), calc(35.56% + 0.00px) calc(0.00% + 0.00px), calc(36.67% + 0.00px) calc(0.00% + 0.00px), calc(37.78% + 0.00px) calc(0.00% + 0.00px), calc(38.89% + 0.00px) calc(0.00% + 0.00px), calc(40.00% + 0.00px) calc(0.00% + 0.00px), calc(41.11% + 0.00px) calc(0.00% + 0.00px), calc(42.22% + 0.00px) calc(0.00% + 0.00px), calc(43.33% + 0.00px) calc(0.00% + 0.00px), calc(44.44% + 0.00px) calc(0.00% + 0.00px), calc(45.56% + 0.00px) calc(0.00% + 0.00px), calc(46.67% + 0.00px) calc(0.00% + 0.00px), calc(47.78% + 0.00px) calc(0.00% + 0.00px), calc(48.89% + 0.00px) calc(0.00% + 0.00px), calc(50.00% + -0.00px) calc(0.00% + 0.00px), calc(51.11% + -0.00px) calc(0.00% + 0.00px), calc(52.22% + -0.00px) calc(0.00% + 0.00px), calc(53.33% + -0.00px) calc(0.00% + 0.00px), calc(54.44% + -0.00px) calc(0.00% + 0.00px), calc(55.56% + -0.00px) calc(0.00% + 0.00px), calc(56.67% + -0.00px) calc(0.00% + 0.00px), calc(57.78% + -0.00px) calc(0.00% + 0.00px), calc(58.89% + -0.00px) calc(0.00% + 0.00px), calc(60.00% + -0.00px) calc(0.00% + 0.00px), calc(61.11% + -0.00px) calc(0.00% + 0.00px), calc(62.22% + -0.00px) calc(0.00% + 0.00px), calc(63.33% + -0.00px) calc(0.00% + 0.00px), calc(64.44% + -0.00px) calc(0.00% + 0.00px), calc(65.56% + -0.00px) calc(0.00% + 0.00px), calc(66.67% + -0.00px) calc(0.00% + 0.00px), calc(67.78% + -0.00px) calc(0.00% + 0.00px), calc(68.89% + -0.00px) calc(0.00% + 0.00px), calc(70.00% + -0.00px) calc(0.00% + 0.00px), calc(71.11% + -0.00px) calc(0.00% + 0.00px), calc(72.22% + -0.00px) calc(0.00% + 0.00px), calc(73.33% + -0.00px) calc(0.00% + 0.00px), calc(74.44% + -0.00px) calc(0.00% + 0.00px), calc(75.56% + -0.00px) calc(0.00% + 0.00px), calc(76.67% + -0.00px) calc(0.00% + 0.00px), calc(77.78% + -0.00px) calc(0.00% + 0.00px), calc(78.89% + -0.00px) calc(0.00% + 0.00px), calc(80.00% + -0.00px) calc(0.00% + 0.00px), calc(81.11% + -0.00px) calc(0.00% + 0.00px), calc(82.22% + -0.00px) calc(0.00% + 0.00px), calc(83.33% + -0.00px) calc(0.00% + 0.00px), calc(84.44% + -0.00px) calc(0.00% + 0.00px), calc(85.56% + -0.00px) calc(0.00% + 0.00px), calc(86.67% + -0.00px) calc(0.00% + 0.00px), calc(87.78% + -0.00px) calc(0.00% + 0.00px), calc(88.89% + -0.00px) calc(0.00% + 0.00px), calc(90.00% + -0.00px) calc(0.00% + 0.00px), calc(91.11% + -0.00px) calc(0.00% + 0.00px), calc(92.22% + -0.00px) calc(0.00% + 0.00px), calc(93.33% + -0.00px) calc(0.00% + 0.00px), calc(94.44% + -0.00px) calc(0.00% + 0.00px), calc(95.56% + -0.00px) calc(0.00% + 0.00px), calc(96.67% + -0.00px) calc(0.00% + 0.00px), calc(97.78% + -0.00px) calc(0.00% + 0.00px), calc(98.89% + -0.00px) calc(0.00% + 0.00px), calc(100.00% + -0.00px) calc(0.00% + 0.00px), calc(100.00% + -0.00px) calc(1.11% + 0.00px), calc(100.00% + -0.00px) calc(2.22% + 0.00px), calc(100.00% + -0.00px) calc(3.33% + 0.00px), calc(100.00% + -0.00px) calc(4.44% + 0.00px), calc(100.00% + -0.00px) calc(5.56% + 0.00px), calc(100.00% + -0.00px) calc(6.67% + 0.00px), calc(100.00% + -0.00px) calc(7.78% + 0.00px), calc(100.00% + -0.00px) calc(8.89% + 0.00px), calc(100.00% + -0.00px) calc(10.00% + 0.00px), calc(100.00% + -0.00px) calc(11.11% + 0.00px), calc(100.00% + -0.00px) calc(12.22% + 0.00px), calc(100.00% + -0.00px) calc(13.33% + 0.00px), calc(100.00% + -0.00px) calc(14.44% + 0.00px), calc(100.00% + -0.00px) calc(15.56% + 0.00px), calc(100.00% + -0.00px) calc(16.67% + 0.00px), calc(100.00% + -0.00px) calc(17.78% + 0.00px), calc(100.00% + -0.00px) calc(18.89% + 0.00px), calc(100.00% + -0.00px) calc(20.00% + 0.00px), calc(100.00% + -0.00px) calc(21.11% + 0.00px), calc(100.00% + -0.00px) calc(22.22% + 0.00px), calc(100.00% + -0.00px) calc(23.33% + 0.00px), calc(100.00% + -0.00px) calc(24.44% + 0.00px), calc(100.00% + -0.00px) calc(25.56% + 0.00px), calc(100.00% + -0.00px) calc(26.67% + 0.00px), calc(100.00% + -0.00px) calc(27.78% + 0.00px), calc(100.00% + -0.00px) calc(28.89% + 0.00px), calc(100.00% + -0.00px) calc(30.00% + 0.00px), calc(100.00% + -0.00px) calc(31.11% + 0.00px), calc(100.00% + -0.00px) calc(32.22% + 0.00px), calc(100.00% + -0.00px) calc(33.33% + 0.00px), calc(100.00% + -0.00px) calc(34.44% + 0.00px), calc(100.00% + -0.00px) calc(35.56% + 0.00px), calc(100.00% + -0.00px) calc(36.67% + 0.00px), calc(100.00% + -0.00px) calc(37.78% + 0.00px), calc(100.00% + -0.00px) calc(38.89% + 0.00px), calc(100.00% + -0.00px) calc(40.00% + 0.00px), calc(100.00% + -0.00px) calc(41.11% + 0.00px), calc(100.00% + -0.00px) calc(42.22% + 0.00px), calc(100.00% + -0.00px) calc(43.33% + 0.00px), calc(100.00% + -0.00px) calc(44.44% + 0.00px), calc(100.00% + -0.00px) calc(45.56% + 0.00px), calc(100.00% + -0.00px) calc(46.67% + 0.00px), calc(100.00% + -0.00px) calc(47.78% + 0.00px), calc(100.00% + -0.00px) calc(48.89% + 0.00px), calc(100.00% + -0.00px) calc(50.00% + -0.00px), calc(100.00% + -0.00px) calc(51.11% + -0.00px), calc(100.00% + -0.00px) calc(52.22% + -0.00px), calc(100.00% + -0.00px) calc(53.33% + -0.00px), calc(100.00% + -0.00px) calc(54.44% + -0.00px), calc(100.00% + -0.00px) calc(55.56% + -0.00px), calc(100.00% + -0.00px) calc(56.67% + -0.00px), calc(100.00% + -0.00px) calc(57.78% + -0.00px), calc(100.00% + -0.00px) calc(58.89% + -0.00px), calc(100.00% + -0.00px) calc(60.00% + -0.00px), calc(100.00% + -0.00px) calc(61.11% + -0.00px), calc(100.00% + -0.00px) calc(62.22% + -0.00px), calc(100.00% + -0.00px) calc(63.33% + -0.00px), calc(100.00% + -0.00px) calc(64.44% + -0.00px), calc(100.00% + -0.00px) calc(65.56% + -0.00px), calc(100.00% + -0.00px) calc(66.67% + -0.00px), calc(100.00% + -0.00px) calc(67.78% + -0.00px), calc(100.00% + -0.00px) calc(68.89% + -0.00px), calc(100.00% + -0.00px) calc(70.00% + -0.00px), calc(100.00% + -0.00px) calc(71.11% + -0.00px), calc(100.00% + -0.00px) calc(72.22% + -0.00px), calc(100.00% + -0.00px) calc(73.33% + -0.00px), calc(100.00% + -0.00px) calc(74.44% + -0.00px), calc(100.00% + -0.00px) calc(75.56% + -0.00px), calc(100.00% + -0.00px) calc(76.67% + -0.00px), calc(100.00% + -0.00px) calc(77.78% + -0.00px), calc(100.00% + -0.00px) calc(78.89% + -0.00px), calc(100.00% + -0.00px) calc(80.00% + -0.00px), calc(100.00% + -0.00px) calc(81.11% + -0.00px), calc(100.00% + -0.00px) calc(82.22% + -0.00px), calc(100.00% + -0.00px) calc(83.33% + -0.00px), calc(100.00% + -0.00px) calc(84.44% + -0.00px), calc(100.00% + -0.00px) calc(85.56% + -0.00px), calc(100.00% + -0.00px) calc(86.67% + -0.00px), calc(100.00% + -0.00px) calc(87.78% + -0.00px), calc(100.00% + -0.00px) calc(88.89% + -0.00px), calc(100.00% + -0.00px) calc(90.00% + -0.00px), calc(100.00% + -0.00px) calc(91.11% + -0.00px), calc(100.00% + -0.00px) calc(92.22% + -0.00px), calc(100.00% + -0.00px) calc(93.33% + -0.00px), calc(100.00% + -0.00px) calc(94.44% + -0.00px), calc(100.00% + -0.00px) calc(95.56% + -0.00px), calc(100.00% + -0.00px) calc(96.67% + -0.00px), calc(100.00% + -0.00px) calc(97.78% + -0.00px), calc(100.00% + -0.00px) calc(98.89% + -0.00px), calc(100.00% + -0.00px) calc(100.00% + -0.00px), calc(98.89% + -0.00px) calc(100.00% + -0.00px), calc(97.78% + -0.00px) calc(100.00% + -0.00px), calc(96.67% + -0.00px) calc(100.00% + -0.00px), calc(95.56% + -0.00px) calc(100.00% + -0.00px), calc(94.44% + -0.00px) calc(100.00% + -0.00px), calc(93.33% + -0.00px) calc(100.00% + -0.00px), calc(92.22% + -0.00px) calc(100.00% + -0.00px), calc(91.11% + -0.00px) calc(100.00% + -0.00px), calc(90.00% + -0.00px) calc(100.00% + -0.00px), calc(88.89% + -0.00px) calc(100.00% + -0.00px), calc(87.78% + -0.00px) calc(100.00% + -0.00px), calc(86.67% + -0.00px) calc(100.00% + -0.00px), calc(85.56% + -0.00px) calc(100.00% + -0.00px), calc(84.44% + -0.00px) calc(100.00% + -0.00px), calc(83.33% + -0.00px) calc(100.00% + -0.00px), calc(82.22% + -0.00px) calc(100.00% + -0.00px), calc(81.11% + -0.00px) calc(100.00% + -0.00px), calc(80.00% + -0.00px) calc(100.00% + -0.00px), calc(78.89% + -0.00px) calc(100.00% + -0.00px), calc(77.78% + -0.00px) calc(100.00% + -0.00px), calc(76.67% + -0.00px) calc(100.00% + -0.00px), calc(75.56% + -0.00px) calc(100.00% + -0.00px), calc(74.44% + -0.00px) calc(100.00% + -0.00px), calc(73.33% + -0.00px) calc(100.00% + -0.00px), calc(72.22% + -0.00px) calc(100.00% + -0.00px), calc(71.11% + -0.00px) calc(100.00% + -0.00px), calc(70.00% + -0.00px) calc(100.00% + -0.00px), calc(68.89% + -0.00px) calc(100.00% + -0.00px), calc(67.78% + -0.00px) calc(100.00% + -0.00px), calc(66.67% + -0.00px) calc(100.00% + -0.00px), calc(65.56% + -0.00px) calc(100.00% + -0.00px), calc(64.44% + -0.00px) calc(100.00% + -0.00px), calc(63.33% + -0.00px) calc(100.00% + -0.00px), calc(62.22% + -0.00px) calc(100.00% + -0.00px), calc(61.11% + -0.00px) calc(100.00% + -0.00px), calc(60.00% + -0.00px) calc(100.00% + -0.00px), calc(58.89% + -0.00px) calc(100.00% + -0.00px), calc(57.78% + -0.00px) calc(100.00% + -0.00px), calc(56.67% + -0.00px) calc(100.00% + -0.00px), calc(55.56% + -0.00px) calc(100.00% + -0.00px), calc(54.44% + -0.00px) calc(100.00% + -0.00px), calc(53.33% + -0.00px) calc(100.00% + -0.00px), calc(52.22% + -0.00px) calc(100.00% + -0.00px), calc(51.11% + -0.00px) calc(100.00% + -0.00px), calc(50.00% + -0.00px) calc(100.00% + -0.00px), calc(48.89% + 0.00px) calc(100.00% + -0.00px), calc(47.78% + 0.00px) calc(100.00% + -0.00px), calc(46.67% + 0.00px) calc(100.00% + -0.00px), calc(45.56% + 0.00px) calc(100.00% + -0.00px), calc(44.44% + 0.00px) calc(100.00% + -0.00px), calc(43.33% + 0.00px) calc(100.00% + -0.00px), calc(42.22% + 0.00px) calc(100.00% + -0.00px), calc(41.11% + 0.00px) calc(100.00% + -0.00px), calc(40.00% + 0.00px) calc(100.00% + -0.00px), calc(38.89% + 0.00px) calc(100.00% + -0.00px), calc(37.78% + 0.00px) calc(100.00% + -0.00px), calc(36.67% + 0.00px) calc(100.00% + -0.00px), calc(35.56% + 0.00px) calc(100.00% + -0.00px), calc(34.44% + 0.00px) calc(100.00% + -0.00px), calc(33.33% + 0.00px) calc(100.00% + -0.00px), calc(32.22% + 0.00px) calc(100.00% + -0.00px), calc(31.11% + 0.00px) calc(100.00% + -0.00px), calc(30.00% + 0.00px) calc(100.00% + -0.00px), calc(28.89% + 0.00px) calc(100.00% + -0.00px), calc(27.78% + 0.00px) calc(100.00% + -0.00px), calc(26.67% + 0.00px) calc(100.00% + -0.00px), calc(25.56% + 0.00px) calc(100.00% + -0.00px), calc(24.44% + 0.00px) calc(100.00% + -0.00px), calc(23.33% + 0.00px) calc(100.00% + -0.00px), calc(22.22% + 0.00px) calc(100.00% + -0.00px), calc(21.11% + 0.00px) calc(100.00% + -0.00px), calc(20.00% + 0.00px) calc(100.00% + -0.00px), calc(18.89% + 0.00px) calc(100.00% + -0.00px), calc(17.78% + 0.00px) calc(100.00% + -0.00px), calc(16.67% + 0.00px) calc(100.00% + -0.00px), calc(15.56% + 0.00px) calc(100.00% + -0.00px), calc(14.44% + 0.00px) calc(100.00% + -0.00px), calc(13.33% + 0.00px) calc(100.00% + -0.00px), calc(12.22% + 0.00px) calc(100.00% + -0.00px), calc(11.11% + 0.00px) calc(100.00% + -0.00px), calc(10.00% + 0.00px) calc(100.00% + -0.00px), calc(8.89% + 0.00px) calc(100.00% + -0.00px), calc(7.78% + 0.00px) calc(100.00% + -0.00px), calc(6.67% + 0.00px) calc(100.00% + -0.00px), calc(5.56% + 0.00px) calc(100.00% + -0.00px), calc(4.44% + 0.00px) calc(100.00% + -0.00px), calc(3.33% + 0.00px) calc(100.00% + -0.00px), calc(2.22% + 0.00px) calc(100.00% + -0.00px), calc(1.11% + 0.00px) calc(100.00% + -0.00px), calc(0.00% + 0.00px) calc(100.00% + -0.00px), calc(0.00% + 0.00px) calc(98.89% + -0.00px), calc(0.00% + 0.00px) calc(97.78% + -0.00px), calc(0.00% + 0.00px) calc(96.67% + -0.00px), calc(0.00% + 0.00px) calc(95.56% + -0.00px), calc(0.00% + 0.00px) calc(94.44% + -0.00px), calc(0.00% + 0.00px) calc(93.33% + -0.00px), calc(0.00% + 0.00px) calc(92.22% + -0.00px), calc(0.00% + 0.00px) calc(91.11% + -0.00px), calc(0.00% + 0.00px) calc(90.00% + -0.00px), calc(0.00% + 0.00px) calc(88.89% + -0.00px), calc(0.00% + 0.00px) calc(87.78% + -0.00px), calc(0.00% + 0.00px) calc(86.67% + -0.00px), calc(0.00% + 0.00px) calc(85.56% + -0.00px), calc(0.00% + 0.00px) calc(84.44% + -0.00px), calc(0.00% + 0.00px) calc(83.33% + -0.00px), calc(0.00% + 0.00px) calc(82.22% + -0.00px), calc(0.00% + 0.00px) calc(81.11% + -0.00px), calc(0.00% + 0.00px) calc(80.00% + -0.00px), calc(0.00% + 0.00px) calc(78.89% + -0.00px), calc(0.00% + 0.00px) calc(77.78% + -0.00px), calc(0.00% + 0.00px) calc(76.67% + -0.00px), calc(0.00% + 0.00px) calc(75.56% + -0.00px), calc(0.00% + 0.00px) calc(74.44% + -0.00px), calc(0.00% + 0.00px) calc(73.33% + -0.00px), calc(0.00% + 0.00px) calc(72.22% + -0.00px), calc(0.00% + 0.00px) calc(71.11% + -0.00px), calc(0.00% + 0.00px) calc(70.00% + -0.00px), calc(0.00% + 0.00px) calc(68.89% + -0.00px), calc(0.00% + 0.00px) calc(67.78% + -0.00px), calc(0.00% + 0.00px) calc(66.67% + -0.00px), calc(0.00% + 0.00px) calc(65.56% + -0.00px), calc(0.00% + 0.00px) calc(64.44% + -0.00px), calc(0.00% + 0.00px) calc(63.33% + -0.00px), calc(0.00% + 0.00px) calc(62.22% + -0.00px), calc(0.00% + 0.00px) calc(61.11% + -0.00px), calc(0.00% + 0.00px) calc(60.00% + -0.00px), calc(0.00% + 0.00px) calc(58.89% + -0.00px), calc(0.00% + 0.00px) calc(57.78% + -0.00px), calc(0.00% + 0.00px) calc(56.67% + -0.00px), calc(0.00% + 0.00px) calc(55.56% + -0.00px), calc(0.00% + 0.00px) calc(54.44% + -0.00px), calc(0.00% + 0.00px) calc(53.33% + -0.00px), calc(0.00% + 0.00px) calc(52.22% + -0.00px), calc(0.00% + 0.00px) calc(51.11% + -0.00px), calc(0.00% + 0.00px) calc(50.00% + -0.00px), calc(0.00% + 0.00px) calc(48.89% + 0.00px), calc(0.00% + 0.00px) calc(47.78% + 0.00px), calc(0.00% + 0.00px) calc(46.67% + 0.00px), calc(0.00% + 0.00px) calc(45.56% + 0.00px), calc(0.00% + 0.00px) calc(44.44% + 0.00px), calc(0.00% + 0.00px) calc(43.33% + 0.00px), calc(0.00% + 0.00px) calc(42.22% + 0.00px), calc(0.00% + 0.00px) calc(41.11% + 0.00px), calc(0.00% + 0.00px) calc(40.00% + 0.00px), calc(0.00% + 0.00px) calc(38.89% + 0.00px), calc(0.00% + 0.00px) calc(37.78% + 0.00px), calc(0.00% + 0.00px) calc(36.67% + 0.00px), calc(0.00% + 0.00px) calc(35.56% + 0.00px), calc(0.00% + 0.00px) calc(34.44% + 0.00px), calc(0.00% + 0.00px) calc(33.33% + 0.00px), calc(0.00% + 0.00px) calc(32.22% + 0.00px), calc(0.00% + 0.00px) calc(31.11% + 0.00px), calc(0.00% + 0.00px) calc(30.00% + 0.00px), calc(0.00% + 0.00px) calc(28.89% + 0.00px), calc(0.00% + 0.00px) calc(27.78% + 0.00px), calc(0.00% + 0.00px) calc(26.67% + 0.00px), calc(0.00% + 0.00px) calc(25.56% + 0.00px), calc(0.00% + 0.00px) calc(24.44% + 0.00px), calc(0.00% + 0.00px) calc(23.33% + 0.00px), calc(0.00% + 0.00px) calc(22.22% + 0.00px), calc(0.00% + 0.00px) calc(21.11% + 0.00px), calc(0.00% + 0.00px) calc(20.00% + 0.00px), calc(0.00% + 0.00px) calc(18.89% + 0.00px), calc(0.00% + 0.00px) calc(17.78% + 0.00px), calc(0.00% + 0.00px) calc(16.67% + 0.00px), calc(0.00% + 0.00px) calc(15.56% + 0.00px), calc(0.00% + 0.00px) calc(14.44% + 0.00px), calc(0.00% + 0.00px) calc(13.33% + 0.00px), calc(0.00% + 0.00px) calc(12.22% + 0.00px), calc(0.00% + 0.00px) calc(11.11% + 0.00px), calc(0.00% + 0.00px) calc(10.00% + 0.00px), calc(0.00% + 0.00px) calc(8.89% + 0.00px), calc(0.00% + 0.00px) calc(7.78% + 0.00px), calc(0.00% + 0.00px) calc(6.67% + 0.00px), calc(0.00% + 0.00px) calc(5.56% + 0.00px), calc(0.00% + 0.00px) calc(4.44% + 0.00px), calc(0.00% + 0.00px) calc(3.33% + 0.00px), calc(0.00% + 0.00px) calc(2.22% + 0.00px), calc(0.00% + 0.00px) calc(1.11% + 0.00px));
  }

  &:has(.map-expanded input:checked) .map {
    clip-path: polygon(calc(0.00% + 5.00px) calc(0.00% + 5.00px), calc(1.11% + 4.89px) calc(0.00% + 5.00px), calc(2.22% + 4.78px) calc(0.00% + 5.00px), calc(3.33% + 4.67px) calc(0.00% + 5.00px), calc(4.44% + 4.56px) calc(0.00% + 5.00px), calc(5.56% + 4.44px) calc(0.00% + 5.00px), calc(6.67% + 4.33px) calc(0.00% + 5.00px), calc(7.78% + 4.22px) calc(0.00% + 5.00px), calc(8.89% + 4.11px) calc(0.00% + 5.00px), calc(10.00% + 4.00px) calc(0.00% + 5.00px), calc(11.11% + 3.89px) calc(0.00% + 5.00px), calc(12.22% + 3.78px) calc(0.00% + 5.00px), calc(13.33% + 3.67px) calc(0.00% + 5.00px), calc(14.44% + 3.56px) calc(0.00% + 5.00px), calc(15.56% + 3.44px) calc(0.00% + 5.00px), calc(16.67% + 3.33px) calc(0.00% + 5.00px), calc(17.78% + 3.22px) calc(0.00% + 5.00px), calc(18.89% + 3.11px) calc(0.00% + 5.00px), calc(20.00% + 3.00px) calc(0.00% + 5.00px), calc(21.11% + 2.89px) calc(0.00% + 5.00px), calc(22.22% + 2.78px) calc(0.00% + 5.00px), calc(23.33% + 2.67px) calc(0.00% + 5.00px), calc(24.44% + 2.56px) calc(0.00% + 5.00px), calc(25.56% + 2.44px) calc(0.00% + 5.00px), calc(26.67% + 2.33px) calc(0.00% + 5.00px), calc(27.78% + 2.22px) calc(0.00% + 5.00px), calc(28.89% + 2.11px) calc(0.00% + 5.00px), calc(30.00% + 2.00px) calc(0.00% + 5.00px), calc(31.11% + 1.89px) calc(0.00% + 5.00px), calc(32.22% + 1.78px) calc(0.00% + 5.00px), calc(33.33% + 1.67px) calc(0.00% + 5.00px), calc(34.44% + 1.56px) calc(0.00% + 5.00px), calc(35.56% + 1.44px) calc(0.00% + 5.00px), calc(36.67% + 1.33px) calc(0.00% + 5.00px), calc(37.78% + 1.22px) calc(0.00% + 5.00px), calc(38.89% + 1.11px) calc(0.00% + 5.00px), calc(40.00% + 1.00px) calc(0.00% + 5.00px), calc(41.11% + 0.89px) calc(0.00% + 5.00px), calc(42.22% + 0.78px) calc(0.00% + 5.00px), calc(43.33% + 0.67px) calc(0.00% + 5.00px), calc(44.44% + 0.56px) calc(0.00% + 5.00px), calc(45.56% + 0.44px) calc(0.00% + 5.00px), calc(46.67% + 0.33px) calc(0.00% + 5.00px), calc(47.78% + 0.22px) calc(0.00% + 5.00px), calc(48.89% + 0.11px) calc(0.00% + 5.00px), calc(50.00% + -0.00px) calc(0.00% + 5.00px), calc(51.11% + -0.11px) calc(0.00% + 5.00px), calc(52.22% + -0.22px) calc(0.00% + 5.00px), calc(53.33% + -0.33px) calc(0.00% + 5.00px), calc(54.44% + -0.44px) calc(0.00% + 5.00px), calc(55.56% + -0.56px) calc(0.00% + 5.00px), calc(56.67% + -0.67px) calc(0.00% + 5.00px), calc(57.78% + -0.78px) calc(0.00% + 5.00px), calc(58.89% + -0.89px) calc(0.00% + 5.00px), calc(60.00% + -1.00px) calc(0.00% + 5.00px), calc(61.11% + -1.11px) calc(0.00% + 5.00px), calc(62.22% + -1.22px) calc(0.00% + 5.00px), calc(63.33% + -1.33px) calc(0.00% + 5.00px), calc(64.44% + -1.44px) calc(0.00% + 5.00px), calc(65.56% + -1.56px) calc(0.00% + 5.00px), calc(66.67% + -1.67px) calc(0.00% + 5.00px), calc(67.78% + -1.78px) calc(0.00% + 5.00px), calc(68.89% + -1.89px) calc(0.00% + 5.00px), calc(70.00% + -2.00px) calc(0.00% + 5.00px), calc(71.11% + -2.11px) calc(0.00% + 5.00px), calc(72.22% + -2.22px) calc(0.00% + 5.00px), calc(73.33% + -2.33px) calc(0.00% + 5.00px), calc(74.44% + -2.44px) calc(0.00% + 5.00px), calc(75.56% + -2.56px) calc(0.00% + 5.00px), calc(76.67% + -2.67px) calc(0.00% + 5.00px), calc(77.78% + -2.78px) calc(0.00% + 5.00px), calc(78.89% + -2.89px) calc(0.00% + 5.00px), calc(80.00% + -3.00px) calc(0.00% + 5.00px), calc(81.11% + -3.11px) calc(0.00% + 5.00px), calc(82.22% + -3.22px) calc(0.00% + 5.00px), calc(83.33% + -3.33px) calc(0.00% + 5.00px), calc(84.44% + -3.44px) calc(0.00% + 5.00px), calc(85.56% + -3.56px) calc(0.00% + 5.00px), calc(86.67% + -3.67px) calc(0.00% + 5.00px), calc(87.78% + -3.78px) calc(0.00% + 5.00px), calc(88.89% + -3.89px) calc(0.00% + 5.00px), calc(90.00% + -4.00px) calc(0.00% + 5.00px), calc(91.11% + -4.11px) calc(0.00% + 5.00px), calc(92.22% + -4.22px) calc(0.00% + 5.00px), calc(93.33% + -4.33px) calc(0.00% + 5.00px), calc(94.44% + -4.44px) calc(0.00% + 5.00px), calc(95.56% + -4.56px) calc(0.00% + 5.00px), calc(96.67% + -4.67px) calc(0.00% + 5.00px), calc(97.78% + -4.78px) calc(0.00% + 5.00px), calc(98.89% + -4.89px) calc(0.00% + 5.00px), calc(100.00% + -5.00px) calc(0.00% + 5.00px), calc(100.00% + -5.00px) calc(1.11% + 4.89px), calc(100.00% + -5.00px) calc(2.22% + 4.78px), calc(100.00% + -5.00px) calc(3.33% + 4.67px), calc(100.00% + -5.00px) calc(4.44% + 4.56px), calc(100.00% + -5.00px) calc(5.56% + 4.44px), calc(100.00% + -5.00px) calc(6.67% + 4.33px), calc(100.00% + -5.00px) calc(7.78% + 4.22px), calc(100.00% + -5.00px) calc(8.89% + 4.11px), calc(100.00% + -5.00px) calc(10.00% + 4.00px), calc(100.00% + -5.00px) calc(11.11% + 3.89px), calc(100.00% + -5.00px) calc(12.22% + 3.78px), calc(100.00% + -5.00px) calc(13.33% + 3.67px), calc(100.00% + -5.00px) calc(14.44% + 3.56px), calc(100.00% + -5.00px) calc(15.56% + 3.44px), calc(100.00% + -5.00px) calc(16.67% + 3.33px), calc(100.00% + -5.00px) calc(17.78% + 3.22px), calc(100.00% + -5.00px) calc(18.89% + 3.11px), calc(100.00% + -5.00px) calc(20.00% + 3.00px), calc(100.00% + -5.00px) calc(21.11% + 2.89px), calc(100.00% + -5.00px) calc(22.22% + 2.78px), calc(100.00% + -5.00px) calc(23.33% + 2.67px), calc(100.00% + -5.00px) calc(24.44% + 2.56px), calc(100.00% + -5.00px) calc(25.56% + 2.44px), calc(100.00% + -5.00px) calc(26.67% + 2.33px), calc(100.00% + -5.00px) calc(27.78% + 2.22px), calc(100.00% + -5.00px) calc(28.89% + 2.11px), calc(100.00% + -5.00px) calc(30.00% + 2.00px), calc(100.00% + -5.00px) calc(31.11% + 1.89px), calc(100.00% + -5.00px) calc(32.22% + 1.78px), calc(100.00% + -5.00px) calc(33.33% + 1.67px), calc(100.00% + -5.00px) calc(34.44% + 1.56px), calc(100.00% + -5.00px) calc(35.56% + 1.44px), calc(100.00% + -5.00px) calc(36.67% + 1.33px), calc(100.00% + -5.00px) calc(37.78% + 1.22px), calc(100.00% + -5.00px) calc(38.89% + 1.11px), calc(100.00% + -5.00px) calc(40.00% + 1.00px), calc(100.00% + -5.00px) calc(41.11% + 0.89px), calc(100.00% + -5.00px) calc(42.22% + 0.78px), calc(100.00% + -5.00px) calc(43.33% + 0.67px), calc(100.00% + -5.00px) calc(44.44% + 0.56px), calc(100.00% + -5.00px) calc(45.56% + 0.44px), calc(100.00% + -5.00px) calc(46.67% + 0.33px), calc(100.00% + -5.00px) calc(47.78% + 0.22px), calc(100.00% + -5.00px) calc(48.89% + 0.11px), calc(100.00% + -5.00px) calc(50.00% + -0.00px), calc(100.00% + -5.00px) calc(51.11% + -0.11px), calc(100.00% + -5.00px) calc(52.22% + -0.22px), calc(100.00% + -5.00px) calc(53.33% + -0.33px), calc(100.00% + -5.00px) calc(54.44% + -0.44px), calc(100.00% + -5.00px) calc(55.56% + -0.56px), calc(100.00% + -5.00px) calc(56.67% + -0.67px), calc(100.00% + -5.00px) calc(57.78% + -0.78px), calc(100.00% + -5.00px) calc(58.89% + -0.89px), calc(100.00% + -5.00px) calc(60.00% + -1.00px), calc(100.00% + -5.00px) calc(61.11% + -1.11px), calc(100.00% + -5.00px) calc(62.22% + -1.22px), calc(100.00% + -5.00px) calc(63.33% + -1.33px), calc(100.00% + -5.00px) calc(64.44% + -1.44px), calc(100.00% + -5.00px) calc(65.56% + -1.56px), calc(100.00% + -5.00px) calc(66.67% + -1.67px), calc(100.00% + -5.00px) calc(67.78% + -1.78px), calc(100.00% + -5.00px) calc(68.89% + -1.89px), calc(100.00% + -5.00px) calc(70.00% + -2.00px), calc(100.00% + -5.00px) calc(71.11% + -2.11px), calc(100.00% + -5.00px) calc(72.22% + -2.22px), calc(100.00% + -5.00px) calc(73.33% + -2.33px), calc(100.00% + -5.00px) calc(74.44% + -2.44px), calc(100.00% + -5.00px) calc(75.56% + -2.56px), calc(100.00% + -5.00px) calc(76.67% + -2.67px), calc(100.00% + -5.00px) calc(77.78% + -2.78px), calc(100.00% + -5.00px) calc(78.89% + -2.89px), calc(100.00% + -5.00px) calc(80.00% + -3.00px), calc(100.00% + -5.00px) calc(81.11% + -3.11px), calc(100.00% + -5.00px) calc(82.22% + -3.22px), calc(100.00% + -5.00px) calc(83.33% + -3.33px), calc(100.00% + -5.00px) calc(84.44% + -3.44px), calc(100.00% + -5.00px) calc(85.56% + -3.56px), calc(100.00% + -5.00px) calc(86.67% + -3.67px), calc(100.00% + -5.00px) calc(87.78% + -3.78px), calc(100.00% + -5.00px) calc(88.89% + -3.89px), calc(100.00% + -5.00px) calc(90.00% + -4.00px), calc(100.00% + -5.00px) calc(91.11% + -4.11px), calc(100.00% + -5.00px) calc(92.22% + -4.22px), calc(100.00% + -5.00px) calc(93.33% + -4.33px), calc(100.00% + -5.00px) calc(94.44% + -4.44px), calc(100.00% + -5.00px) calc(95.56% + -4.56px), calc(100.00% + -5.00px) calc(96.67% + -4.67px), calc(100.00% + -5.00px) calc(97.78% + -4.78px), calc(100.00% + -5.00px) calc(98.89% + -4.89px), calc(100.00% + -5.00px) calc(100.00% + -5.00px), calc(98.89% + -4.89px) calc(100.00% + -5.00px), calc(97.78% + -4.78px) calc(100.00% + -5.00px), calc(96.67% + -4.67px) calc(100.00% + -5.00px), calc(95.56% + -4.56px) calc(100.00% + -5.00px), calc(94.44% + -4.44px) calc(100.00% + -5.00px), calc(93.33% + -4.33px) calc(100.00% + -5.00px), calc(92.22% + -4.22px) calc(100.00% + -5.00px), calc(91.11% + -4.11px) calc(100.00% + -5.00px), calc(90.00% + -4.00px) calc(100.00% + -5.00px), calc(88.89% + -3.89px) calc(100.00% + -5.00px), calc(87.78% + -3.78px) calc(100.00% + -5.00px), calc(86.67% + -3.67px) calc(100.00% + -5.00px), calc(85.56% + -3.56px) calc(100.00% + -5.00px), calc(84.44% + -3.44px) calc(100.00% + -5.00px), calc(83.33% + -3.33px) calc(100.00% + -5.00px), calc(82.22% + -3.22px) calc(100.00% + -5.00px), calc(81.11% + -3.11px) calc(100.00% + -5.00px), calc(80.00% + -3.00px) calc(100.00% + -5.00px), calc(78.89% + -2.89px) calc(100.00% + -5.00px), calc(77.78% + -2.78px) calc(100.00% + -5.00px), calc(76.67% + -2.67px) calc(100.00% + -5.00px), calc(75.56% + -2.56px) calc(100.00% + -5.00px), calc(74.44% + -2.44px) calc(100.00% + -5.00px), calc(73.33% + -2.33px) calc(100.00% + -5.00px), calc(72.22% + -2.22px) calc(100.00% + -5.00px), calc(71.11% + -2.11px) calc(100.00% + -5.00px), calc(70.00% + -2.00px) calc(100.00% + -5.00px), calc(68.89% + -1.89px) calc(100.00% + -5.00px), calc(67.78% + -1.78px) calc(100.00% + -5.00px), calc(66.67% + -1.67px) calc(100.00% + -5.00px), calc(65.56% + -1.56px) calc(100.00% + -5.00px), calc(64.44% + -1.44px) calc(100.00% + -5.00px), calc(63.33% + -1.33px) calc(100.00% + -5.00px), calc(62.22% + -1.22px) calc(100.00% + -5.00px), calc(61.11% + -1.11px) calc(100.00% + -5.00px), calc(60.00% + -1.00px) calc(100.00% + -5.00px), calc(58.89% + -0.89px) calc(100.00% + -5.00px), calc(57.78% + -0.78px) calc(100.00% + -5.00px), calc(56.67% + -0.67px) calc(100.00% + -5.00px), calc(55.56% + -0.56px) calc(100.00% + -5.00px), calc(54.44% + -0.44px) calc(100.00% + -5.00px), calc(53.33% + -0.33px) calc(100.00% + -5.00px), calc(52.22% + -0.22px) calc(100.00% + -5.00px), calc(51.11% + -0.11px) calc(100.00% + -5.00px), calc(50.00% + -0.00px) calc(100.00% + -5.00px), calc(48.89% + 0.11px) calc(100.00% + -5.00px), calc(47.78% + 0.22px) calc(100.00% + -5.00px), calc(46.67% + 0.33px) calc(100.00% + -5.00px), calc(45.56% + 0.44px) calc(100.00% + -5.00px), calc(44.44% + 0.56px) calc(100.00% + -5.00px), calc(43.33% + 0.67px) calc(100.00% + -5.00px), calc(42.22% + 0.78px) calc(100.00% + -5.00px), calc(41.11% + 0.89px) calc(100.00% + -5.00px), calc(40.00% + 1.00px) calc(100.00% + -5.00px), calc(38.89% + 1.11px) calc(100.00% + -5.00px), calc(37.78% + 1.22px) calc(100.00% + -5.00px), calc(36.67% + 1.33px) calc(100.00% + -5.00px), calc(35.56% + 1.44px) calc(100.00% + -5.00px), calc(34.44% + 1.56px) calc(100.00% + -5.00px), calc(33.33% + 1.67px) calc(100.00% + -5.00px), calc(32.22% + 1.78px) calc(100.00% + -5.00px), calc(31.11% + 1.89px) calc(100.00% + -5.00px), calc(30.00% + 2.00px) calc(100.00% + -5.00px), calc(28.89% + 2.11px) calc(100.00% + -5.00px), calc(27.78% + 2.22px) calc(100.00% + -5.00px), calc(26.67% + 2.33px) calc(100.00% + -5.00px), calc(25.56% + 2.44px) calc(100.00% + -5.00px), calc(24.44% + 2.56px) calc(100.00% + -5.00px), calc(23.33% + 2.67px) calc(100.00% + -5.00px), calc(22.22% + 2.78px) calc(100.00% + -5.00px), calc(21.11% + 2.89px) calc(100.00% + -5.00px), calc(20.00% + 3.00px) calc(100.00% + -5.00px), calc(18.89% + 3.11px) calc(100.00% + -5.00px), calc(17.78% + 3.22px) calc(100.00% + -5.00px), calc(16.67% + 3.33px) calc(100.00% + -5.00px), calc(15.56% + 3.44px) calc(100.00% + -5.00px), calc(14.44% + 3.56px) calc(100.00% + -5.00px), calc(13.33% + 3.67px) calc(100.00% + -5.00px), calc(12.22% + 3.78px) calc(100.00% + -5.00px), calc(11.11% + 3.89px) calc(100.00% + -5.00px), calc(10.00% + 4.00px) calc(100.00% + -5.00px), calc(8.89% + 4.11px) calc(100.00% + -5.00px), calc(7.78% + 4.22px) calc(100.00% + -5.00px), calc(6.67% + 4.33px) calc(100.00% + -5.00px), calc(5.56% + 4.44px) calc(100.00% + -5.00px), calc(4.44% + 4.56px) calc(100.00% + -5.00px), calc(3.33% + 4.67px) calc(100.00% + -5.00px), calc(2.22% + 4.78px) calc(100.00% + -5.00px), calc(1.11% + 4.89px) calc(100.00% + -5.00px), calc(0.00% + 5.00px) calc(100.00% + -5.00px), calc(0.00% + 5.00px) calc(98.89% + -4.89px), calc(0.00% + 5.00px) calc(97.78% + -4.78px), calc(0.00% + 5.00px) calc(96.67% + -4.67px), calc(0.00% + 5.00px) calc(95.56% + -4.56px), calc(0.00% + 5.00px) calc(94.44% + -4.44px), calc(0.00% + 5.00px) calc(93.33% + -4.33px), calc(0.00% + 5.00px) calc(92.22% + -4.22px), calc(0.00% + 5.00px) calc(91.11% + -4.11px), calc(0.00% + 5.00px) calc(90.00% + -4.00px), calc(0.00% + 5.00px) calc(88.89% + -3.89px), calc(0.00% + 5.00px) calc(87.78% + -3.78px), calc(0.00% + 5.00px) calc(86.67% + -3.67px), calc(0.00% + 5.00px) calc(85.56% + -3.56px), calc(0.00% + 5.00px) calc(84.44% + -3.44px), calc(0.00% + 5.00px) calc(83.33% + -3.33px), calc(0.00% + 5.00px) calc(82.22% + -3.22px), calc(0.00% + 5.00px) calc(81.11% + -3.11px), calc(0.00% + 5.00px) calc(80.00% + -3.00px), calc(0.00% + 5.00px) calc(78.89% + -2.89px), calc(0.00% + 5.00px) calc(77.78% + -2.78px), calc(0.00% + 5.00px) calc(76.67% + -2.67px), calc(0.00% + 5.00px) calc(75.56% + -2.56px), calc(0.00% + 5.00px) calc(74.44% + -2.44px), calc(0.00% + 5.00px) calc(73.33% + -2.33px), calc(0.00% + 5.00px) calc(72.22% + -2.22px), calc(0.00% + 5.00px) calc(71.11% + -2.11px), calc(0.00% + 5.00px) calc(70.00% + -2.00px), calc(0.00% + 5.00px) calc(68.89% + -1.89px), calc(0.00% + 5.00px) calc(67.78% + -1.78px), calc(0.00% + 5.00px) calc(66.67% + -1.67px), calc(0.00% + 5.00px) calc(65.56% + -1.56px), calc(0.00% + 5.00px) calc(64.44% + -1.44px), calc(0.00% + 5.00px) calc(63.33% + -1.33px), calc(0.00% + 5.00px) calc(62.22% + -1.22px), calc(0.00% + 5.00px) calc(61.11% + -1.11px), calc(0.00% + 5.00px) calc(60.00% + -1.00px), calc(0.00% + 5.00px) calc(58.89% + -0.89px), calc(0.00% + 5.00px) calc(57.78% + -0.78px), calc(0.00% + 5.00px) calc(56.67% + -0.67px), calc(0.00% + 5.00px) calc(55.56% + -0.56px), calc(0.00% + 5.00px) calc(54.44% + -0.44px), calc(0.00% + 5.00px) calc(53.33% + -0.33px), calc(0.00% + 5.00px) calc(52.22% + -0.22px), calc(0.00% + 5.00px) calc(51.11% + -0.11px), calc(0.00% + 5.00px) calc(50.00% + -0.00px), calc(0.00% + 5.00px) calc(48.89% + 0.11px), calc(0.00% + 5.00px) calc(47.78% + 0.22px), calc(0.00% + 5.00px) calc(46.67% + 0.33px), calc(0.00% + 5.00px) calc(45.56% + 0.44px), calc(0.00% + 5.00px) calc(44.44% + 0.56px), calc(0.00% + 5.00px) calc(43.33% + 0.67px), calc(0.00% + 5.00px) calc(42.22% + 0.78px), calc(0.00% + 5.00px) calc(41.11% + 0.89px), calc(0.00% + 5.00px) calc(40.00% + 1.00px), calc(0.00% + 5.00px) calc(38.89% + 1.11px), calc(0.00% + 5.00px) calc(37.78% + 1.22px), calc(0.00% + 5.00px) calc(36.67% + 1.33px), calc(0.00% + 5.00px) calc(35.56% + 1.44px), calc(0.00% + 5.00px) calc(34.44% + 1.56px), calc(0.00% + 5.00px) calc(33.33% + 1.67px), calc(0.00% + 5.00px) calc(32.22% + 1.78px), calc(0.00% + 5.00px) calc(31.11% + 1.89px), calc(0.00% + 5.00px) calc(30.00% + 2.00px), calc(0.00% + 5.00px) calc(28.89% + 2.11px), calc(0.00% + 5.00px) calc(27.78% + 2.22px), calc(0.00% + 5.00px) calc(26.67% + 2.33px), calc(0.00% + 5.00px) calc(25.56% + 2.44px), calc(0.00% + 5.00px) calc(24.44% + 2.56px), calc(0.00% + 5.00px) calc(23.33% + 2.67px), calc(0.00% + 5.00px) calc(22.22% + 2.78px), calc(0.00% + 5.00px) calc(21.11% + 2.89px), calc(0.00% + 5.00px) calc(20.00% + 3.00px), calc(0.00% + 5.00px) calc(18.89% + 3.11px), calc(0.00% + 5.00px) calc(17.78% + 3.22px), calc(0.00% + 5.00px) calc(16.67% + 3.33px), calc(0.00% + 5.00px) calc(15.56% + 3.44px), calc(0.00% + 5.00px) calc(14.44% + 3.56px), calc(0.00% + 5.00px) calc(13.33% + 3.67px), calc(0.00% + 5.00px) calc(12.22% + 3.78px), calc(0.00% + 5.00px) calc(11.11% + 3.89px), calc(0.00% + 5.00px) calc(10.00% + 4.00px), calc(0.00% + 5.00px) calc(8.89% + 4.11px), calc(0.00% + 5.00px) calc(7.78% + 4.22px), calc(0.00% + 5.00px) calc(6.67% + 4.33px), calc(0.00% + 5.00px) calc(5.56% + 4.44px), calc(0.00% + 5.00px) calc(4.44% + 4.56px), calc(0.00% + 5.00px) calc(3.33% + 4.67px), calc(0.00% + 5.00px) calc(2.22% + 4.78px), calc(0.00% + 5.00px) calc(1.11% + 4.89px));
  }
}

.map {
  transition: clip-path 600ms;
  height: 100%;
  width: 100%;
  clip-path: polygon(calc(14.64% + 3.54px) calc(14.64% + 3.54px), calc(15.27% + 3.47px) calc(14.03% + 3.60px), calc(15.90% + 3.41px) calc(13.43% + 3.66px), calc(16.54% + 3.35px) calc(12.84% + 3.72px), calc(17.20% + 3.28px) calc(12.26% + 3.77px), calc(17.86% + 3.21px) calc(11.70% + 3.83px), calc(18.53% + 3.15px) calc(11.14% + 3.89px), calc(19.22% + 3.08px) calc(10.60% + 3.94px), calc(19.91% + 3.01px) calc(10.07% + 3.99px), calc(20.61% + 2.94px) calc(9.55% + 4.05px), calc(21.32% + 2.87px) calc(9.04% + 4.10px), calc(22.04% + 2.80px) calc(8.55% + 4.15px), calc(22.77% + 2.72px) calc(8.07% + 4.19px), calc(23.50% + 2.65px) calc(7.60% + 4.24px), calc(24.25% + 2.58px) calc(7.14% + 4.29px), calc(25.00% + 2.50px) calc(6.70% + 4.33px), calc(25.76% + 2.42px) calc(6.27% + 4.37px), calc(26.53% + 2.35px) calc(5.85% + 4.41px), calc(27.30% + 2.27px) calc(5.45% + 4.46px), calc(28.08% + 2.19px) calc(5.06% + 4.49px), calc(28.87% + 2.11px) calc(4.68% + 4.53px), calc(29.66% + 2.03px) calc(4.32% + 4.57px), calc(30.46% + 1.95px) calc(3.97% + 4.60px), calc(31.27% + 1.87px) calc(3.64% + 4.64px), calc(32.08% + 1.79px) calc(3.32% + 4.67px), calc(32.90% + 1.71px) calc(3.02% + 4.70px), calc(33.72% + 1.63px) calc(2.72% + 4.73px), calc(34.55% + 1.55px) calc(2.45% + 4.76px), calc(35.38% + 1.46px) calc(2.18% + 4.78px), calc(36.22% + 1.38px) calc(1.94% + 4.81px), calc(37.06% + 1.29px) calc(1.70% + 4.83px), calc(37.90% + 1.21px) calc(1.49% + 4.85px), calc(38.75% + 1.12px) calc(1.28% + 4.87px), calc(39.60% + 1.04px) calc(1.09% + 4.89px), calc(40.46% + 0.95px) calc(0.92% + 4.91px), calc(41.32% + 0.87px) calc(0.76% + 4.92px), calc(42.18% + 0.78px) calc(0.62% + 4.94px), calc(43.04% + 0.70px) calc(0.49% + 4.95px), calc(43.91% + 0.61px) calc(0.37% + 4.96px), calc(44.77% + 0.52px) calc(0.27% + 4.97px), calc(45.64% + 0.44px) calc(0.19% + 4.98px), calc(46.51% + 0.35px) calc(0.12% + 4.99px), calc(47.38% + 0.26px) calc(0.07% + 4.99px), calc(48.26% + 0.17px) calc(0.03% + 5.00px), calc(49.13% + 0.09px) calc(0.01% + 5.00px), calc(50.00% + 0.00px) calc(0.00% + 5.00px), calc(50.87% + -0.09px) calc(0.01% + 5.00px), calc(51.74% + -0.17px) calc(0.03% + 5.00px), calc(52.62% + -0.26px) calc(0.07% + 4.99px), calc(53.49% + -0.35px) calc(0.12% + 4.99px), calc(54.36% + -0.44px) calc(0.19% + 4.98px), calc(55.23% + -0.52px) calc(0.27% + 4.97px), calc(56.09% + -0.61px) calc(0.37% + 4.96px), calc(56.96% + -0.70px) calc(0.49% + 4.95px), calc(57.82% + -0.78px) calc(0.62% + 4.94px), calc(58.68% + -0.87px) calc(0.76% + 4.92px), calc(59.54% + -0.95px) calc(0.92% + 4.91px), calc(60.40% + -1.04px) calc(1.09% + 4.89px), calc(61.25% + -1.12px) calc(1.28% + 4.87px), calc(62.10% + -1.21px) calc(1.49% + 4.85px), calc(62.94% + -1.29px) calc(1.70% + 4.83px), calc(63.78% + -1.38px) calc(1.94% + 4.81px), calc(64.62% + -1.46px) calc(2.18% + 4.78px), calc(65.45% + -1.55px) calc(2.45% + 4.76px), calc(66.28% + -1.63px) calc(2.72% + 4.73px), calc(67.10% + -1.71px) calc(3.02% + 4.70px), calc(67.92% + -1.79px) calc(3.32% + 4.67px), calc(68.73% + -1.87px) calc(3.64% + 4.64px), calc(69.54% + -1.95px) calc(3.97% + 4.60px), calc(70.34% + -2.03px) calc(4.32% + 4.57px), calc(71.13% + -2.11px) calc(4.68% + 4.53px), calc(71.92% + -2.19px) calc(5.06% + 4.49px), calc(72.70% + -2.27px) calc(5.45% + 4.46px), calc(73.47% + -2.35px) calc(5.85% + 4.41px), calc(74.24% + -2.42px) calc(6.27% + 4.37px), calc(75.00% + -2.50px) calc(6.70% + 4.33px), calc(75.75% + -2.58px) calc(7.14% + 4.29px), calc(76.50% + -2.65px) calc(7.60% + 4.24px), calc(77.23% + -2.72px) calc(8.07% + 4.19px), calc(77.96% + -2.80px) calc(8.55% + 4.15px), calc(78.68% + -2.87px) calc(9.04% + 4.10px), calc(79.39% + -2.94px) calc(9.55% + 4.05px), calc(80.09% + -3.01px) calc(10.07% + 3.99px), calc(80.78% + -3.08px) calc(10.60% + 3.94px), calc(81.47% + -3.15px) calc(11.14% + 3.89px), calc(82.14% + -3.21px) calc(11.70% + 3.83px), calc(82.80% + -3.28px) calc(12.26% + 3.77px), calc(83.46% + -3.35px) calc(12.84% + 3.72px), calc(84.10% + -3.41px) calc(13.43% + 3.66px), calc(84.73% + -3.47px) calc(14.03% + 3.60px), calc(85.36% + -3.54px) calc(14.64% + 3.54px), calc(85.97% + -3.60px) calc(15.27% + 3.47px), calc(86.57% + -3.66px) calc(15.90% + 3.41px), calc(87.16% + -3.72px) calc(16.54% + 3.35px), calc(87.74% + -3.77px) calc(17.20% + 3.28px), calc(88.30% + -3.83px) calc(17.86% + 3.21px), calc(88.86% + -3.89px) calc(18.53% + 3.15px), calc(89.40% + -3.94px) calc(19.22% + 3.08px), calc(89.93% + -3.99px) calc(19.91% + 3.01px), calc(90.45% + -4.05px) calc(20.61% + 2.94px), calc(90.96% + -4.10px) calc(21.32% + 2.87px), calc(91.45% + -4.15px) calc(22.04% + 2.80px), calc(91.93% + -4.19px) calc(22.77% + 2.72px), calc(92.40% + -4.24px) calc(23.50% + 2.65px), calc(92.86% + -4.29px) calc(24.25% + 2.58px), calc(93.30% + -4.33px) calc(25.00% + 2.50px), calc(93.73% + -4.37px) calc(25.76% + 2.42px), calc(94.15% + -4.41px) calc(26.53% + 2.35px), calc(94.55% + -4.46px) calc(27.30% + 2.27px), calc(94.94% + -4.49px) calc(28.08% + 2.19px), calc(95.32% + -4.53px) calc(28.87% + 2.11px), calc(95.68% + -4.57px) calc(29.66% + 2.03px), calc(96.03% + -4.60px) calc(30.46% + 1.95px), calc(96.36% + -4.64px) calc(31.27% + 1.87px), calc(96.68% + -4.67px) calc(32.08% + 1.79px), calc(96.98% + -4.70px) calc(32.90% + 1.71px), calc(97.28% + -4.73px) calc(33.72% + 1.63px), calc(97.55% + -4.76px) calc(34.55% + 1.55px), calc(97.82% + -4.78px) calc(35.38% + 1.46px), calc(98.06% + -4.81px) calc(36.22% + 1.38px), calc(98.30% + -4.83px) calc(37.06% + 1.29px), calc(98.51% + -4.85px) calc(37.90% + 1.21px), calc(98.72% + -4.87px) calc(38.75% + 1.12px), calc(98.91% + -4.89px) calc(39.60% + 1.04px), calc(99.08% + -4.91px) calc(40.46% + 0.95px), calc(99.24% + -4.92px) calc(41.32% + 0.87px), calc(99.38% + -4.94px) calc(42.18% + 0.78px), calc(99.51% + -4.95px) calc(43.04% + 0.70px), calc(99.63% + -4.96px) calc(43.91% + 0.61px), calc(99.73% + -4.97px) calc(44.77% + 0.52px), calc(99.81% + -4.98px) calc(45.64% + 0.44px), calc(99.88% + -4.99px) calc(46.51% + 0.35px), calc(99.93% + -4.99px) calc(47.38% + 0.26px), calc(99.97% + -5.00px) calc(48.26% + 0.17px), calc(99.99% + -5.00px) calc(49.13% + 0.09px), calc(100.00% + -5.00px) calc(50.00% + 0.00px), calc(99.99% + -5.00px) calc(50.87% + -0.09px), calc(99.97% + -5.00px) calc(51.74% + -0.17px), calc(99.93% + -4.99px) calc(52.62% + -0.26px), calc(99.88% + -4.99px) calc(53.49% + -0.35px), calc(99.81% + -4.98px) calc(54.36% + -0.44px), calc(99.73% + -4.97px) calc(55.23% + -0.52px), calc(99.63% + -4.96px) calc(56.09% + -0.61px), calc(99.51% + -4.95px) calc(56.96% + -0.70px), calc(99.38% + -4.94px) calc(57.82% + -0.78px), calc(99.24% + -4.92px) calc(58.68% + -0.87px), calc(99.08% + -4.91px) calc(59.54% + -0.95px), calc(98.91% + -4.89px) calc(60.40% + -1.04px), calc(98.72% + -4.87px) calc(61.25% + -1.12px), calc(98.51% + -4.85px) calc(62.10% + -1.21px), calc(98.30% + -4.83px) calc(62.94% + -1.29px), calc(98.06% + -4.81px) calc(63.78% + -1.38px), calc(97.82% + -4.78px) calc(64.62% + -1.46px), calc(97.55% + -4.76px) calc(65.45% + -1.55px), calc(97.28% + -4.73px) calc(66.28% + -1.63px), calc(96.98% + -4.70px) calc(67.10% + -1.71px), calc(96.68% + -4.67px) calc(67.92% + -1.79px), calc(96.36% + -4.64px) calc(68.73% + -1.87px), calc(96.03% + -4.60px) calc(69.54% + -1.95px), calc(95.68% + -4.57px) calc(70.34% + -2.03px), calc(95.32% + -4.53px) calc(71.13% + -2.11px), calc(94.94% + -4.49px) calc(71.92% + -2.19px), calc(94.55% + -4.46px) calc(72.70% + -2.27px), calc(94.15% + -4.41px) calc(73.47% + -2.35px), calc(93.73% + -4.37px) calc(74.24% + -2.42px), calc(93.30% + -4.33px) calc(75.00% + -2.50px), calc(92.86% + -4.29px) calc(75.75% + -2.58px), calc(92.40% + -4.24px) calc(76.50% + -2.65px), calc(91.93% + -4.19px) calc(77.23% + -2.72px), calc(91.45% + -4.15px) calc(77.96% + -2.80px), calc(90.96% + -4.10px) calc(78.68% + -2.87px), calc(90.45% + -4.05px) calc(79.39% + -2.94px), calc(89.93% + -3.99px) calc(80.09% + -3.01px), calc(89.40% + -3.94px) calc(80.78% + -3.08px), calc(88.86% + -3.89px) calc(81.47% + -3.15px), calc(88.30% + -3.83px) calc(82.14% + -3.21px), calc(87.74% + -3.77px) calc(82.80% + -3.28px), calc(87.16% + -3.72px) calc(83.46% + -3.35px), calc(86.57% + -3.66px) calc(84.10% + -3.41px), calc(85.97% + -3.60px) calc(84.73% + -3.47px), calc(85.36% + -3.54px) calc(85.36% + -3.54px), calc(84.73% + -3.47px) calc(85.97% + -3.60px), calc(84.10% + -3.41px) calc(86.57% + -3.66px), calc(83.46% + -3.35px) calc(87.16% + -3.72px), calc(82.80% + -3.28px) calc(87.74% + -3.77px), calc(82.14% + -3.21px) calc(88.30% + -3.83px), calc(81.47% + -3.15px) calc(88.86% + -3.89px), calc(80.78% + -3.08px) calc(89.40% + -3.94px), calc(80.09% + -3.01px) calc(89.93% + -3.99px), calc(79.39% + -2.94px) calc(90.45% + -4.05px), calc(78.68% + -2.87px) calc(90.96% + -4.10px), calc(77.96% + -2.80px) calc(91.45% + -4.15px), calc(77.23% + -2.72px) calc(91.93% + -4.19px), calc(76.50% + -2.65px) calc(92.40% + -4.24px), calc(75.75% + -2.58px) calc(92.86% + -4.29px), calc(75.00% + -2.50px) calc(93.30% + -4.33px), calc(74.24% + -2.42px) calc(93.73% + -4.37px), calc(73.47% + -2.35px) calc(94.15% + -4.41px), calc(72.70% + -2.27px) calc(94.55% + -4.46px), calc(71.92% + -2.19px) calc(94.94% + -4.49px), calc(71.13% + -2.11px) calc(95.32% + -4.53px), calc(70.34% + -2.03px) calc(95.68% + -4.57px), calc(69.54% + -1.95px) calc(96.03% + -4.60px), calc(68.73% + -1.87px) calc(96.36% + -4.64px), calc(67.92% + -1.79px) calc(96.68% + -4.67px), calc(67.10% + -1.71px) calc(96.98% + -4.70px), calc(66.28% + -1.63px) calc(97.28% + -4.73px), calc(65.45% + -1.55px) calc(97.55% + -4.76px), calc(64.62% + -1.46px) calc(97.82% + -4.78px), calc(63.78% + -1.38px) calc(98.06% + -4.81px), calc(62.94% + -1.29px) calc(98.30% + -4.83px), calc(62.10% + -1.21px) calc(98.51% + -4.85px), calc(61.25% + -1.12px) calc(98.72% + -4.87px), calc(60.40% + -1.04px) calc(98.91% + -4.89px), calc(59.54% + -0.95px) calc(99.08% + -4.91px), calc(58.68% + -0.87px) calc(99.24% + -4.92px), calc(57.82% + -0.78px) calc(99.38% + -4.94px), calc(56.96% + -0.70px) calc(99.51% + -4.95px), calc(56.09% + -0.61px) calc(99.63% + -4.96px), calc(55.23% + -0.52px) calc(99.73% + -4.97px), calc(54.36% + -0.44px) calc(99.81% + -4.98px), calc(53.49% + -0.35px) calc(99.88% + -4.99px), calc(52.62% + -0.26px) calc(99.93% + -4.99px), calc(51.74% + -0.17px) calc(99.97% + -5.00px), calc(50.87% + -0.09px) calc(99.99% + -5.00px), calc(50.00% + -0.00px) calc(100.00% + -5.00px), calc(49.13% + 0.09px) calc(99.99% + -5.00px), calc(48.26% + 0.17px) calc(99.97% + -5.00px), calc(47.38% + 0.26px) calc(99.93% + -4.99px), calc(46.51% + 0.35px) calc(99.88% + -4.99px), calc(45.64% + 0.44px) calc(99.81% + -4.98px), calc(44.77% + 0.52px) calc(99.73% + -4.97px), calc(43.91% + 0.61px) calc(99.63% + -4.96px), calc(43.04% + 0.70px) calc(99.51% + -4.95px), calc(42.18% + 0.78px) calc(99.38% + -4.94px), calc(41.32% + 0.87px) calc(99.24% + -4.92px), calc(40.46% + 0.95px) calc(99.08% + -4.91px), calc(39.60% + 1.04px) calc(98.91% + -4.89px), calc(38.75% + 1.12px) calc(98.72% + -4.87px), calc(37.90% + 1.21px) calc(98.51% + -4.85px), calc(37.06% + 1.29px) calc(98.30% + -4.83px), calc(36.22% + 1.38px) calc(98.06% + -4.81px), calc(35.38% + 1.46px) calc(97.82% + -4.78px), calc(34.55% + 1.55px) calc(97.55% + -4.76px), calc(33.72% + 1.63px) calc(97.28% + -4.73px), calc(32.90% + 1.71px) calc(96.98% + -4.70px), calc(32.08% + 1.79px) calc(96.68% + -4.67px), calc(31.27% + 1.87px) calc(96.36% + -4.64px), calc(30.46% + 1.95px) calc(96.03% + -4.60px), calc(29.66% + 2.03px) calc(95.68% + -4.57px), calc(28.87% + 2.11px) calc(95.32% + -4.53px), calc(28.08% + 2.19px) calc(94.94% + -4.49px), calc(27.30% + 2.27px) calc(94.55% + -4.46px), calc(26.53% + 2.35px) calc(94.15% + -4.41px), calc(25.76% + 2.42px) calc(93.73% + -4.37px), calc(25.00% + 2.50px) calc(93.30% + -4.33px), calc(24.25% + 2.58px) calc(92.86% + -4.29px), calc(23.50% + 2.65px) calc(92.40% + -4.24px), calc(22.77% + 2.72px) calc(91.93% + -4.19px), calc(22.04% + 2.80px) calc(91.45% + -4.15px), calc(21.32% + 2.87px) calc(90.96% + -4.10px), calc(20.61% + 2.94px) calc(90.45% + -4.05px), calc(19.91% + 3.01px) calc(89.93% + -3.99px), calc(19.22% + 3.08px) calc(89.40% + -3.94px), calc(18.53% + 3.15px) calc(88.86% + -3.89px), calc(17.86% + 3.21px) calc(88.30% + -3.83px), calc(17.20% + 3.28px) calc(87.74% + -3.77px), calc(16.54% + 3.35px) calc(87.16% + -3.72px), calc(15.90% + 3.41px) calc(86.57% + -3.66px), calc(15.27% + 3.47px) calc(85.97% + -3.60px), calc(14.64% + 3.54px) calc(85.36% + -3.54px), calc(14.03% + 3.60px) calc(84.73% + -3.47px), calc(13.43% + 3.66px) calc(84.10% + -3.41px), calc(12.84% + 3.72px) calc(83.46% + -3.35px), calc(12.26% + 3.77px) calc(82.80% + -3.28px), calc(11.70% + 3.83px) calc(82.14% + -3.21px), calc(11.14% + 3.89px) calc(81.47% + -3.15px), calc(10.60% + 3.94px) calc(80.78% + -3.08px), calc(10.07% + 3.99px) calc(80.09% + -3.01px), calc(9.55% + 4.05px) calc(79.39% + -2.94px), calc(9.04% + 4.10px) calc(78.68% + -2.87px), calc(8.55% + 4.15px) calc(77.96% + -2.80px), calc(8.07% + 4.19px) calc(77.23% + -2.72px), calc(7.60% + 4.24px) calc(76.50% + -2.65px), calc(7.14% + 4.29px) calc(75.75% + -2.58px), calc(6.70% + 4.33px) calc(75.00% + -2.50px), calc(6.27% + 4.37px) calc(74.24% + -2.42px), calc(5.85% + 4.41px) calc(73.47% + -2.35px), calc(5.45% + 4.46px) calc(72.70% + -2.27px), calc(5.06% + 4.49px) calc(71.92% + -2.19px), calc(4.68% + 4.53px) calc(71.13% + -2.11px), calc(4.32% + 4.57px) calc(70.34% + -2.03px), calc(3.97% + 4.60px) calc(69.54% + -1.95px), calc(3.64% + 4.64px) calc(68.73% + -1.87px), calc(3.32% + 4.67px) calc(67.92% + -1.79px), calc(3.02% + 4.70px) calc(67.10% + -1.71px), calc(2.72% + 4.73px) calc(66.28% + -1.63px), calc(2.45% + 4.76px) calc(65.45% + -1.55px), calc(2.18% + 4.78px) calc(64.62% + -1.46px), calc(1.94% + 4.81px) calc(63.78% + -1.38px), calc(1.70% + 4.83px) calc(62.94% + -1.29px), calc(1.49% + 4.85px) calc(62.10% + -1.21px), calc(1.28% + 4.87px) calc(61.25% + -1.12px), calc(1.09% + 4.89px) calc(60.40% + -1.04px), calc(0.92% + 4.91px) calc(59.54% + -0.95px), calc(0.76% + 4.92px) calc(58.68% + -0.87px), calc(0.62% + 4.94px) calc(57.82% + -0.78px), calc(0.49% + 4.95px) calc(56.96% + -0.70px), calc(0.37% + 4.96px) calc(56.09% + -0.61px), calc(0.27% + 4.97px) calc(55.23% + -0.52px), calc(0.19% + 4.98px) calc(54.36% + -0.44px), calc(0.12% + 4.99px) calc(53.49% + -0.35px), calc(0.07% + 4.99px) calc(52.62% + -0.26px), calc(0.03% + 5.00px) calc(51.74% + -0.17px), calc(0.01% + 5.00px) calc(50.87% + -0.09px), calc(0.00% + 5.00px) calc(50.00% + -0.00px), calc(0.01% + 5.00px) calc(49.13% + 0.09px), calc(0.03% + 5.00px) calc(48.26% + 0.17px), calc(0.07% + 4.99px) calc(47.38% + 0.26px), calc(0.12% + 4.99px) calc(46.51% + 0.35px), calc(0.19% + 4.98px) calc(45.64% + 0.44px), calc(0.27% + 4.97px) calc(44.77% + 0.52px), calc(0.37% + 4.96px) calc(43.91% + 0.61px), calc(0.49% + 4.95px) calc(43.04% + 0.70px), calc(0.62% + 4.94px) calc(42.18% + 0.78px), calc(0.76% + 4.92px) calc(41.32% + 0.87px), calc(0.92% + 4.91px) calc(40.46% + 0.95px), calc(1.09% + 4.89px) calc(39.60% + 1.04px), calc(1.28% + 4.87px) calc(38.75% + 1.12px), calc(1.49% + 4.85px) calc(37.90% + 1.21px), calc(1.70% + 4.83px) calc(37.06% + 1.29px), calc(1.94% + 4.81px) calc(36.22% + 1.38px), calc(2.18% + 4.78px) calc(35.38% + 1.46px), calc(2.45% + 4.76px) calc(34.55% + 1.55px), calc(2.72% + 4.73px) calc(33.72% + 1.63px), calc(3.02% + 4.70px) calc(32.90% + 1.71px), calc(3.32% + 4.67px) calc(32.08% + 1.79px), calc(3.64% + 4.64px) calc(31.27% + 1.87px), calc(3.97% + 4.60px) calc(30.46% + 1.95px), calc(4.32% + 4.57px) calc(29.66% + 2.03px), calc(4.68% + 4.53px) calc(28.87% + 2.11px), calc(5.06% + 4.49px) calc(28.08% + 2.19px), calc(5.45% + 4.46px) calc(27.30% + 2.27px), calc(5.85% + 4.41px) calc(26.53% + 2.35px), calc(6.27% + 4.37px) calc(25.76% + 2.42px), calc(6.70% + 4.33px) calc(25.00% + 2.50px), calc(7.14% + 4.29px) calc(24.25% + 2.58px), calc(7.60% + 4.24px) calc(23.50% + 2.65px), calc(8.07% + 4.19px) calc(22.77% + 2.72px), calc(8.55% + 4.15px) calc(22.04% + 2.80px), calc(9.04% + 4.10px) calc(21.32% + 2.87px), calc(9.55% + 4.05px) calc(20.61% + 2.94px), calc(10.07% + 3.99px) calc(19.91% + 3.01px), calc(10.60% + 3.94px) calc(19.22% + 3.08px), calc(11.14% + 3.89px) calc(18.53% + 3.15px), calc(11.70% + 3.83px) calc(17.86% + 3.21px), calc(12.26% + 3.77px) calc(17.20% + 3.28px), calc(12.84% + 3.72px) calc(16.54% + 3.35px), calc(13.43% + 3.66px) calc(15.90% + 3.41px), calc(14.03% + 3.60px) calc(15.27% + 3.47px));
}

.map-border {
  transition: clip-path 600ms;
  height: 100%;
  width: 100%;
  background-color: darkgray;
  clip-path: polygon(calc(14.64% + 0.00px) calc(14.64% + 0.00px), calc(15.27% + 0.00px) calc(14.03% + 0.00px), calc(15.90% + 0.00px) calc(13.43% + 0.00px), calc(16.54% + 0.00px) calc(12.84% + 0.00px), calc(17.20% + 0.00px) calc(12.26% + 0.00px), calc(17.86% + 0.00px) calc(11.70% + 0.00px), calc(18.53% + 0.00px) calc(11.14% + 0.00px), calc(19.22% + 0.00px) calc(10.60% + 0.00px), calc(19.91% + 0.00px) calc(10.07% + 0.00px), calc(20.61% + 0.00px) calc(9.55% + 0.00px), calc(21.32% + 0.00px) calc(9.04% + 0.00px), calc(22.04% + 0.00px) calc(8.55% + 0.00px), calc(22.77% + 0.00px) calc(8.07% + 0.00px), calc(23.50% + 0.00px) calc(7.60% + 0.00px), calc(24.25% + 0.00px) calc(7.14% + 0.00px), calc(25.00% + 0.00px) calc(6.70% + 0.00px), calc(25.76% + 0.00px) calc(6.27% + 0.00px), calc(26.53% + 0.00px) calc(5.85% + 0.00px), calc(27.30% + 0.00px) calc(5.45% + 0.00px), calc(28.08% + 0.00px) calc(5.06% + 0.00px), calc(28.87% + 0.00px) calc(4.68% + 0.00px), calc(29.66% + 0.00px) calc(4.32% + 0.00px), calc(30.46% + 0.00px) calc(3.97% + 0.00px), calc(31.27% + 0.00px) calc(3.64% + 0.00px), calc(32.08% + 0.00px) calc(3.32% + 0.00px), calc(32.90% + 0.00px) calc(3.02% + 0.00px), calc(33.72% + 0.00px) calc(2.72% + 0.00px), calc(34.55% + 0.00px) calc(2.45% + 0.00px), calc(35.38% + 0.00px) calc(2.18% + 0.00px), calc(36.22% + 0.00px) calc(1.94% + 0.00px), calc(37.06% + 0.00px) calc(1.70% + 0.00px), calc(37.90% + 0.00px) calc(1.49% + 0.00px), calc(38.75% + 0.00px) calc(1.28% + 0.00px), calc(39.60% + 0.00px) calc(1.09% + 0.00px), calc(40.46% + 0.00px) calc(0.92% + 0.00px), calc(41.32% + 0.00px) calc(0.76% + 0.00px), calc(42.18% + 0.00px) calc(0.62% + 0.00px), calc(43.04% + 0.00px) calc(0.49% + 0.00px), calc(43.91% + 0.00px) calc(0.37% + 0.00px), calc(44.77% + 0.00px) calc(0.27% + 0.00px), calc(45.64% + 0.00px) calc(0.19% + 0.00px), calc(46.51% + 0.00px) calc(0.12% + 0.00px), calc(47.38% + 0.00px) calc(0.07% + 0.00px), calc(48.26% + 0.00px) calc(0.03% + 0.00px), calc(49.13% + 0.00px) calc(0.01% + 0.00px), calc(50.00% + 0.00px) calc(0.00% + 0.00px), calc(50.87% + -0.00px) calc(0.01% + 0.00px), calc(51.74% + -0.00px) calc(0.03% + 0.00px), calc(52.62% + -0.00px) calc(0.07% + 0.00px), calc(53.49% + -0.00px) calc(0.12% + 0.00px), calc(54.36% + -0.00px) calc(0.19% + 0.00px), calc(55.23% + -0.00px) calc(0.27% + 0.00px), calc(56.09% + -0.00px) calc(0.37% + 0.00px), calc(56.96% + -0.00px) calc(0.49% + 0.00px), calc(57.82% + -0.00px) calc(0.62% + 0.00px), calc(58.68% + -0.00px) calc(0.76% + 0.00px), calc(59.54% + -0.00px) calc(0.92% + 0.00px), calc(60.40% + -0.00px) calc(1.09% + 0.00px), calc(61.25% + -0.00px) calc(1.28% + 0.00px), calc(62.10% + -0.00px) calc(1.49% + 0.00px), calc(62.94% + -0.00px) calc(1.70% + 0.00px), calc(63.78% + -0.00px) calc(1.94% + 0.00px), calc(64.62% + -0.00px) calc(2.18% + 0.00px), calc(65.45% + -0.00px) calc(2.45% + 0.00px), calc(66.28% + -0.00px) calc(2.72% + 0.00px), calc(67.10% + -0.00px) calc(3.02% + 0.00px), calc(67.92% + -0.00px) calc(3.32% + 0.00px), calc(68.73% + -0.00px) calc(3.64% + 0.00px), calc(69.54% + -0.00px) calc(3.97% + 0.00px), calc(70.34% + -0.00px) calc(4.32% + 0.00px), calc(71.13% + -0.00px) calc(4.68% + 0.00px), calc(71.92% + -0.00px) calc(5.06% + 0.00px), calc(72.70% + -0.00px) calc(5.45% + 0.00px), calc(73.47% + -0.00px) calc(5.85% + 0.00px), calc(74.24% + -0.00px) calc(6.27% + 0.00px), calc(75.00% + -0.00px) calc(6.70% + 0.00px), calc(75.75% + -0.00px) calc(7.14% + 0.00px), calc(76.50% + -0.00px) calc(7.60% + 0.00px), calc(77.23% + -0.00px) calc(8.07% + 0.00px), calc(77.96% + -0.00px) calc(8.55% + 0.00px), calc(78.68% + -0.00px) calc(9.04% + 0.00px), calc(79.39% + -0.00px) calc(9.55% + 0.00px), calc(80.09% + -0.00px) calc(10.07% + 0.00px), calc(80.78% + -0.00px) calc(10.60% + 0.00px), calc(81.47% + -0.00px) calc(11.14% + 0.00px), calc(82.14% + -0.00px) calc(11.70% + 0.00px), calc(82.80% + -0.00px) calc(12.26% + 0.00px), calc(83.46% + -0.00px) calc(12.84% + 0.00px), calc(84.10% + -0.00px) calc(13.43% + 0.00px), calc(84.73% + -0.00px) calc(14.03% + 0.00px), calc(85.36% + -0.00px) calc(14.64% + 0.00px), calc(85.97% + -0.00px) calc(15.27% + 0.00px), calc(86.57% + -0.00px) calc(15.90% + 0.00px), calc(87.16% + -0.00px) calc(16.54% + 0.00px), calc(87.74% + -0.00px) calc(17.20% + 0.00px), calc(88.30% + -0.00px) calc(17.86% + 0.00px), calc(88.86% + -0.00px) calc(18.53% + 0.00px), calc(89.40% + -0.00px) calc(19.22% + 0.00px), calc(89.93% + -0.00px) calc(19.91% + 0.00px), calc(90.45% + -0.00px) calc(20.61% + 0.00px), calc(90.96% + -0.00px) calc(21.32% + 0.00px), calc(91.45% + -0.00px) calc(22.04% + 0.00px), calc(91.93% + -0.00px) calc(22.77% + 0.00px), calc(92.40% + -0.00px) calc(23.50% + 0.00px), calc(92.86% + -0.00px) calc(24.25% + 0.00px), calc(93.30% + -0.00px) calc(25.00% + 0.00px), calc(93.73% + -0.00px) calc(25.76% + 0.00px), calc(94.15% + -0.00px) calc(26.53% + 0.00px), calc(94.55% + -0.00px) calc(27.30% + 0.00px), calc(94.94% + -0.00px) calc(28.08% + 0.00px), calc(95.32% + -0.00px) calc(28.87% + 0.00px), calc(95.68% + -0.00px) calc(29.66% + 0.00px), calc(96.03% + -0.00px) calc(30.46% + 0.00px), calc(96.36% + -0.00px) calc(31.27% + 0.00px), calc(96.68% + -0.00px) calc(32.08% + 0.00px), calc(96.98% + -0.00px) calc(32.90% + 0.00px), calc(97.28% + -0.00px) calc(33.72% + 0.00px), calc(97.55% + -0.00px) calc(34.55% + 0.00px), calc(97.82% + -0.00px) calc(35.38% + 0.00px), calc(98.06% + -0.00px) calc(36.22% + 0.00px), calc(98.30% + -0.00px) calc(37.06% + 0.00px), calc(98.51% + -0.00px) calc(37.90% + 0.00px), calc(98.72% + -0.00px) calc(38.75% + 0.00px), calc(98.91% + -0.00px) calc(39.60% + 0.00px), calc(99.08% + -0.00px) calc(40.46% + 0.00px), calc(99.24% + -0.00px) calc(41.32% + 0.00px), calc(99.38% + -0.00px) calc(42.18% + 0.00px), calc(99.51% + -0.00px) calc(43.04% + 0.00px), calc(99.63% + -0.00px) calc(43.91% + 0.00px), calc(99.73% + -0.00px) calc(44.77% + 0.00px), calc(99.81% + -0.00px) calc(45.64% + 0.00px), calc(99.88% + -0.00px) calc(46.51% + 0.00px), calc(99.93% + -0.00px) calc(47.38% + 0.00px), calc(99.97% + -0.00px) calc(48.26% + 0.00px), calc(99.99% + -0.00px) calc(49.13% + 0.00px), calc(100.00% + -0.00px) calc(50.00% + 0.00px), calc(99.99% + -0.00px) calc(50.87% + -0.00px), calc(99.97% + -0.00px) calc(51.74% + -0.00px), calc(99.93% + -0.00px) calc(52.62% + -0.00px), calc(99.88% + -0.00px) calc(53.49% + -0.00px), calc(99.81% + -0.00px) calc(54.36% + -0.00px), calc(99.73% + -0.00px) calc(55.23% + -0.00px), calc(99.63% + -0.00px) calc(56.09% + -0.00px), calc(99.51% + -0.00px) calc(56.96% + -0.00px), calc(99.38% + -0.00px) calc(57.82% + -0.00px), calc(99.24% + -0.00px) calc(58.68% + -0.00px), calc(99.08% + -0.00px) calc(59.54% + -0.00px), calc(98.91% + -0.00px) calc(60.40% + -0.00px), calc(98.72% + -0.00px) calc(61.25% + -0.00px), calc(98.51% + -0.00px) calc(62.10% + -0.00px), calc(98.30% + -0.00px) calc(62.94% + -0.00px), calc(98.06% + -0.00px) calc(63.78% + -0.00px), calc(97.82% + -0.00px) calc(64.62% + -0.00px), calc(97.55% + -0.00px) calc(65.45% + -0.00px), calc(97.28% + -0.00px) calc(66.28% + -0.00px), calc(96.98% + -0.00px) calc(67.10% + -0.00px), calc(96.68% + -0.00px) calc(67.92% + -0.00px), calc(96.36% + -0.00px) calc(68.73% + -0.00px), calc(96.03% + -0.00px) calc(69.54% + -0.00px), calc(95.68% + -0.00px) calc(70.34% + -0.00px), calc(95.32% + -0.00px) calc(71.13% + -0.00px), calc(94.94% + -0.00px) calc(71.92% + -0.00px), calc(94.55% + -0.00px) calc(72.70% + -0.00px), calc(94.15% + -0.00px) calc(73.47% + -0.00px), calc(93.73% + -0.00px) calc(74.24% + -0.00px), calc(93.30% + -0.00px) calc(75.00% + -0.00px), calc(92.86% + -0.00px) calc(75.75% + -0.00px), calc(92.40% + -0.00px) calc(76.50% + -0.00px), calc(91.93% + -0.00px) calc(77.23% + -0.00px), calc(91.45% + -0.00px) calc(77.96% + -0.00px), calc(90.96% + -0.00px) calc(78.68% + -0.00px), calc(90.45% + -0.00px) calc(79.39% + -0.00px), calc(89.93% + -0.00px) calc(80.09% + -0.00px), calc(89.40% + -0.00px) calc(80.78% + -0.00px), calc(88.86% + -0.00px) calc(81.47% + -0.00px), calc(88.30% + -0.00px) calc(82.14% + -0.00px), calc(87.74% + -0.00px) calc(82.80% + -0.00px), calc(87.16% + -0.00px) calc(83.46% + -0.00px), calc(86.57% + -0.00px) calc(84.10% + -0.00px), calc(85.97% + -0.00px) calc(84.73% + -0.00px), calc(85.36% + -0.00px) calc(85.36% + -0.00px), calc(84.73% + -0.00px) calc(85.97% + -0.00px), calc(84.10% + -0.00px) calc(86.57% + -0.00px), calc(83.46% + -0.00px) calc(87.16% + -0.00px), calc(82.80% + -0.00px) calc(87.74% + -0.00px), calc(82.14% + -0.00px) calc(88.30% + -0.00px), calc(81.47% + -0.00px) calc(88.86% + -0.00px), calc(80.78% + -0.00px) calc(89.40% + -0.00px), calc(80.09% + -0.00px) calc(89.93% + -0.00px), calc(79.39% + -0.00px) calc(90.45% + -0.00px), calc(78.68% + -0.00px) calc(90.96% + -0.00px), calc(77.96% + -0.00px) calc(91.45% + -0.00px), calc(77.23% + -0.00px) calc(91.93% + -0.00px), calc(76.50% + -0.00px) calc(92.40% + -0.00px), calc(75.75% + -0.00px) calc(92.86% + -0.00px), calc(75.00% + -0.00px) calc(93.30% + -0.00px), calc(74.24% + -0.00px) calc(93.73% + -0.00px), calc(73.47% + -0.00px) calc(94.15% + -0.00px), calc(72.70% + -0.00px) calc(94.55% + -0.00px), calc(71.92% + -0.00px) calc(94.94% + -0.00px), calc(71.13% + -0.00px) calc(95.32% + -0.00px), calc(70.34% + -0.00px) calc(95.68% + -0.00px), calc(69.54% + -0.00px) calc(96.03% + -0.00px), calc(68.73% + -0.00px) calc(96.36% + -0.00px), calc(67.92% + -0.00px) calc(96.68% + -0.00px), calc(67.10% + -0.00px) calc(96.98% + -0.00px), calc(66.28% + -0.00px) calc(97.28% + -0.00px), calc(65.45% + -0.00px) calc(97.55% + -0.00px), calc(64.62% + -0.00px) calc(97.82% + -0.00px), calc(63.78% + -0.00px) calc(98.06% + -0.00px), calc(62.94% + -0.00px) calc(98.30% + -0.00px), calc(62.10% + -0.00px) calc(98.51% + -0.00px), calc(61.25% + -0.00px) calc(98.72% + -0.00px), calc(60.40% + -0.00px) calc(98.91% + -0.00px), calc(59.54% + -0.00px) calc(99.08% + -0.00px), calc(58.68% + -0.00px) calc(99.24% + -0.00px), calc(57.82% + -0.00px) calc(99.38% + -0.00px), calc(56.96% + -0.00px) calc(99.51% + -0.00px), calc(56.09% + -0.00px) calc(99.63% + -0.00px), calc(55.23% + -0.00px) calc(99.73% + -0.00px), calc(54.36% + -0.00px) calc(99.81% + -0.00px), calc(53.49% + -0.00px) calc(99.88% + -0.00px), calc(52.62% + -0.00px) calc(99.93% + -0.00px), calc(51.74% + -0.00px) calc(99.97% + -0.00px), calc(50.87% + -0.00px) calc(99.99% + -0.00px), calc(50.00% + -0.00px) calc(100.00% + -0.00px), calc(49.13% + 0.00px) calc(99.99% + -0.00px), calc(48.26% + 0.00px) calc(99.97% + -0.00px), calc(47.38% + 0.00px) calc(99.93% + -0.00px), calc(46.51% + 0.00px) calc(99.88% + -0.00px), calc(45.64% + 0.00px) calc(99.81% + -0.00px), calc(44.77% + 0.00px) calc(99.73% + -0.00px), calc(43.91% + 0.00px) calc(99.63% + -0.00px), calc(43.04% + 0.00px) calc(99.51% + -0.00px), calc(42.18% + 0.00px) calc(99.38% + -0.00px), calc(41.32% + 0.00px) calc(99.24% + -0.00px), calc(40.46% + 0.00px) calc(99.08% + -0.00px), calc(39.60% + 0.00px) calc(98.91% + -0.00px), calc(38.75% + 0.00px) calc(98.72% + -0.00px), calc(37.90% + 0.00px) calc(98.51% + -0.00px), calc(37.06% + 0.00px) calc(98.30% + -0.00px), calc(36.22% + 0.00px) calc(98.06% + -0.00px), calc(35.38% + 0.00px) calc(97.82% + -0.00px), calc(34.55% + 0.00px) calc(97.55% + -0.00px), calc(33.72% + 0.00px) calc(97.28% + -0.00px), calc(32.90% + 0.00px) calc(96.98% + -0.00px), calc(32.08% + 0.00px) calc(96.68% + -0.00px), calc(31.27% + 0.00px) calc(96.36% + -0.00px), calc(30.46% + 0.00px) calc(96.03% + -0.00px), calc(29.66% + 0.00px) calc(95.68% + -0.00px), calc(28.87% + 0.00px) calc(95.32% + -0.00px), calc(28.08% + 0.00px) calc(94.94% + -0.00px), calc(27.30% + 0.00px) calc(94.55% + -0.00px), calc(26.53% + 0.00px) calc(94.15% + -0.00px), calc(25.76% + 0.00px) calc(93.73% + -0.00px), calc(25.00% + 0.00px) calc(93.30% + -0.00px), calc(24.25% + 0.00px) calc(92.86% + -0.00px), calc(23.50% + 0.00px) calc(92.40% + -0.00px), calc(22.77% + 0.00px) calc(91.93% + -0.00px), calc(22.04% + 0.00px) calc(91.45% + -0.00px), calc(21.32% + 0.00px) calc(90.96% + -0.00px), calc(20.61% + 0.00px) calc(90.45% + -0.00px), calc(19.91% + 0.00px) calc(89.93% + -0.00px), calc(19.22% + 0.00px) calc(89.40% + -0.00px), calc(18.53% + 0.00px) calc(88.86% + -0.00px), calc(17.86% + 0.00px) calc(88.30% + -0.00px), calc(17.20% + 0.00px) calc(87.74% + -0.00px), calc(16.54% + 0.00px) calc(87.16% + -0.00px), calc(15.90% + 0.00px) calc(86.57% + -0.00px), calc(15.27% + 0.00px) calc(85.97% + -0.00px), calc(14.64% + 0.00px) calc(85.36% + -0.00px), calc(14.03% + 0.00px) calc(84.73% + -0.00px), calc(13.43% + 0.00px) calc(84.10% + -0.00px), calc(12.84% + 0.00px) calc(83.46% + -0.00px), calc(12.26% + 0.00px) calc(82.80% + -0.00px), calc(11.70% + 0.00px) calc(82.14% + -0.00px), calc(11.14% + 0.00px) calc(81.47% + -0.00px), calc(10.60% + 0.00px) calc(80.78% + -0.00px), calc(10.07% + 0.00px) calc(80.09% + -0.00px), calc(9.55% + 0.00px) calc(79.39% + -0.00px), calc(9.04% + 0.00px) calc(78.68% + -0.00px), calc(8.55% + 0.00px) calc(77.96% + -0.00px), calc(8.07% + 0.00px) calc(77.23% + -0.00px), calc(7.60% + 0.00px) calc(76.50% + -0.00px), calc(7.14% + 0.00px) calc(75.75% + -0.00px), calc(6.70% + 0.00px) calc(75.00% + -0.00px), calc(6.27% + 0.00px) calc(74.24% + -0.00px), calc(5.85% + 0.00px) calc(73.47% + -0.00px), calc(5.45% + 0.00px) calc(72.70% + -0.00px), calc(5.06% + 0.00px) calc(71.92% + -0.00px), calc(4.68% + 0.00px) calc(71.13% + -0.00px), calc(4.32% + 0.00px) calc(70.34% + -0.00px), calc(3.97% + 0.00px) calc(69.54% + -0.00px), calc(3.64% + 0.00px) calc(68.73% + -0.00px), calc(3.32% + 0.00px) calc(67.92% + -0.00px), calc(3.02% + 0.00px) calc(67.10% + -0.00px), calc(2.72% + 0.00px) calc(66.28% + -0.00px), calc(2.45% + 0.00px) calc(65.45% + -0.00px), calc(2.18% + 0.00px) calc(64.62% + -0.00px), calc(1.94% + 0.00px) calc(63.78% + -0.00px), calc(1.70% + 0.00px) calc(62.94% + -0.00px), calc(1.49% + 0.00px) calc(62.10% + -0.00px), calc(1.28% + 0.00px) calc(61.25% + -0.00px), calc(1.09% + 0.00px) calc(60.40% + -0.00px), calc(0.92% + 0.00px) calc(59.54% + -0.00px), calc(0.76% + 0.00px) calc(58.68% + -0.00px), calc(0.62% + 0.00px) calc(57.82% + -0.00px), calc(0.49% + 0.00px) calc(56.96% + -0.00px), calc(0.37% + 0.00px) calc(56.09% + -0.00px), calc(0.27% + 0.00px) calc(55.23% + -0.00px), calc(0.19% + 0.00px) calc(54.36% + -0.00px), calc(0.12% + 0.00px) calc(53.49% + -0.00px), calc(0.07% + 0.00px) calc(52.62% + -0.00px), calc(0.03% + 0.00px) calc(51.74% + -0.00px), calc(0.01% + 0.00px) calc(50.87% + -0.00px), calc(0.00% + 0.00px) calc(50.00% + -0.00px), calc(0.01% + 0.00px) calc(49.13% + 0.00px), calc(0.03% + 0.00px) calc(48.26% + 0.00px), calc(0.07% + 0.00px) calc(47.38% + 0.00px), calc(0.12% + 0.00px) calc(46.51% + 0.00px), calc(0.19% + 0.00px) calc(45.64% + 0.00px), calc(0.27% + 0.00px) calc(44.77% + 0.00px), calc(0.37% + 0.00px) calc(43.91% + 0.00px), calc(0.49% + 0.00px) calc(43.04% + 0.00px), calc(0.62% + 0.00px) calc(42.18% + 0.00px), calc(0.76% + 0.00px) calc(41.32% + 0.00px), calc(0.92% + 0.00px) calc(40.46% + 0.00px), calc(1.09% + 0.00px) calc(39.60% + 0.00px), calc(1.28% + 0.00px) calc(38.75% + 0.00px), calc(1.49% + 0.00px) calc(37.90% + 0.00px), calc(1.70% + 0.00px) calc(37.06% + 0.00px), calc(1.94% + 0.00px) calc(36.22% + 0.00px), calc(2.18% + 0.00px) calc(35.38% + 0.00px), calc(2.45% + 0.00px) calc(34.55% + 0.00px), calc(2.72% + 0.00px) calc(33.72% + 0.00px), calc(3.02% + 0.00px) calc(32.90% + 0.00px), calc(3.32% + 0.00px) calc(32.08% + 0.00px), calc(3.64% + 0.00px) calc(31.27% + 0.00px), calc(3.97% + 0.00px) calc(30.46% + 0.00px), calc(4.32% + 0.00px) calc(29.66% + 0.00px), calc(4.68% + 0.00px) calc(28.87% + 0.00px), calc(5.06% + 0.00px) calc(28.08% + 0.00px), calc(5.45% + 0.00px) calc(27.30% + 0.00px), calc(5.85% + 0.00px) calc(26.53% + 0.00px), calc(6.27% + 0.00px) calc(25.76% + 0.00px), calc(6.70% + 0.00px) calc(25.00% + 0.00px), calc(7.14% + 0.00px) calc(24.25% + 0.00px), calc(7.60% + 0.00px) calc(23.50% + 0.00px), calc(8.07% + 0.00px) calc(22.77% + 0.00px), calc(8.55% + 0.00px) calc(22.04% + 0.00px), calc(9.04% + 0.00px) calc(21.32% + 0.00px), calc(9.55% + 0.00px) calc(20.61% + 0.00px), calc(10.07% + 0.00px) calc(19.91% + 0.00px), calc(10.60% + 0.00px) calc(19.22% + 0.00px), calc(11.14% + 0.00px) calc(18.53% + 0.00px), calc(11.70% + 0.00px) calc(17.86% + 0.00px), calc(12.26% + 0.00px) calc(17.20% + 0.00px), calc(12.84% + 0.00px) calc(16.54% + 0.00px), calc(13.43% + 0.00px) calc(15.90% + 0.00px), calc(14.03% + 0.00px) calc(15.27% + 0.00px));
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

@media screen and (max-width: 1024px) {
  .game {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 4.5rem 1fr 0fr;
  }

  .game:has(.map-expanded input:checked) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 4.5rem 50px 1fr;
  }

  .timer {
    grid-row: 1;
    grid-column: 1;
  }

  .stage {
    grid-row: 1;
    grid-column: 2;
  }

  .guess {
    grid-row: 1;
    grid-column: 4;
  }

  .floor {
    grid-row: 1;
    grid-column: 3;
  }

  .map-holder {
    display: none;
  }

  .map-container {
    grid-column: 1/-1;
    grid-row: 3/-1;

    &:has(.map-expanded input:checked) .map-border {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }

    &:has(.map-expanded input:checked) .map {
      clip-path: polygon(5px 5px, calc(100% - 5px) 5px, calc(100% - 5px) calc(100% - 5px), 5px calc(100% - 5px));
    }
  }

  .map-expanded {
    top: 0;
    left: 0;
    margin-top: -55px;
    margin-left: 5px;
  }

  .map {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }

  .map-border {
    clip-path: polygon(5px 5px, calc(100% - 5px) 5px, calc(100% - 5px) calc(100% - 5px), 5px calc(100% - 5px));
  }
}

@media screen and (max-width: 480px) {
  .game {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 4.5rem 4.5rem 1fr 0fr;
  }

  .game:has(.map-expanded input:checked) {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 4.5rem 4.5rem 50px 1fr;
  }

  .timer {
    grid-row: 1;
    grid-column: 1;
  }

  .stage {
    grid-row: 1;
    grid-column: 2;
  }

  .guess {
    grid-row: 2;
    grid-column: 1;
  }

  .floor {
    grid-row: 2;
    grid-column: 2;
  }

  .map-container {
    grid-column: 1/-1;
    grid-row: 4/-1;
  }
}
</style>
