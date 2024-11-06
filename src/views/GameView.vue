<script setup lang="ts">
import { GoogleMap, Marker } from 'vue3-google-map'
import DynamicImage from '@/components/DynamicImage.vue'
import { useModal } from 'vue-final-modal'
import GuessResultsModal from '@/components/GuessResultsModal.vue'
import type { Guess } from '@/models/guess'
import type { Image } from '@/models/image'
import type { MapConfig } from '@/models/mapConfig'
import guessMarkerImg from '@/assets/images/guessflag.png'
import actualMarkerImg from '@/assets/images/targetflag.png'
import { CONFIG } from '@/data/gameview_config'
import { getRandomImage, resetGuessedImageSet } from '@/utils/image-support'
import { isUndefined, sum } from 'es-toolkit'
import { UserInfo } from '@/data/user-info'
import { LeaderboardCredential } from '@/data/leaderboard-credential'
import { useRouter } from 'vue-router'

const router = useRouter()

const url = LeaderboardCredential.url

// we need to include the width and height as hints for the browser to reserve enough space
const image = ref<Image | undefined>(undefined)

//#region Config

const selectedFloor = CONFIG.selectedFloor
const score_boundary = CONFIG.score_boundary
const apikey = CONFIG.apikey
const OIC_COORD = CONFIG.OIC_COORD
const zoomcontrol = CONFIG.zoomcontrol
const maptypecontrol = CONFIG.maptypecontrol
const streetviewcontrol = CONFIG.streetviewcontrol
const initialZoom = CONFIG.initialZoom
const mapTypeId = CONFIG.mapTypeId
const map_styles = CONFIG.map_styles
const mapExpanded = CONFIG.mapExpanded

//#endregion Config

const guessIndex = ref(0)
let currentRoundScore = 0
const roundScores = new Array<number>(10).fill(0)
const maxScore = 2000
const distanceForZeroScore = 40

let markerPosition = { lat: 0, lng: 0 }
let actualPosition = { lat: 0, lng: 0 }
let center = { lat: 0, lng: 0 }

let horizontalDistance = 0
let floorDiff = 0
let correctGuess = false
let correctGuesses = 0

const guessMarkerOption = ref<google.maps.MarkerOptions>({
  position: markerPosition,
  visible: false,
})
const actualMarkerOption = ref<google.maps.MarkerOptions>({
  position: actualPosition,
  visible: true,
})

//#region Computed

const stageText = computed(() => `${guessIndex.value} / 10`)

const timerText = computed(() => `${timerSeconds.value < 10 ? '0' : ''}${timerSeconds.value}`)

const guess = computed<Guess | undefined>(() => {
  return {
    correct: correctGuess,
    distance: horizontalDistance,
    time: timerText.value,
    stage: stageText.value,
    guessIndex: guessIndex.value,
    guessedCoordinate: markerPosition,
    floorDiff: floorDiff,
  }
})

const mapConfig = computed<MapConfig | undefined>(() => {
  return {
    apikey: apikey,
    center: center,
    zoomcontrol: zoomcontrol,
    maptypecontrol: maptypecontrol,
    streetviewcontrol: streetviewcontrol,
    map_styles: map_styles,
    zoom: resultZoom,
    mapTypeId: 'satellite',
    tilt: 0,
  }
})

//#endregion Computed

//#region Zoom

const currentZoom = ref(initialZoom)
let resultZoom = initialZoom

function toggleMapExpansionZoom() {
  if (mapExpanded.value) {
    currentZoom.value += 1.4
  } else {
    currentZoom.value -= 1.4
  }
}

//#endregion Zoom

//#region Timer

let timerInterval = 1000
const timerSeconds = ref(0)
let totalTime = 0 // in seconds

function startTimer() {
  if (timerInterval !== 1000) {
    clearInterval(timerInterval)
  }
  timerSeconds.value = 30
  timerInterval = window.setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--
    } else {
      evaluate()
      startNextRound()
      clearInterval(timerInterval)
    }
  }, 1000)
}

//#endregion Timer

async function sendData() {
  console.log('sending data')
  const date = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const minutes = Math.floor(totalTime / 60)
  const seconds = totalTime % 60
  const time = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  const totalScore = sum(roundScores)
  const record = `${date}, ${time}, ${totalScore}, ${UserInfo.value.campus}`
  console.log('record: ', record)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: UserInfo.value.name,
      score: record,
    }),
  })
}

function evaluate() {
  if (isUndefined(image.value)) {
    throw new Error('Image is undefined')
  }
  if (image.value) {
    floorDiff = Math.abs(parseInt(selectedFloor.value[0]) - image.value.floor)
  }
  horizontalDistance = getHorizontalDistance()
  if (horizontalDistance > distanceForZeroScore || timerSeconds.value === 0) {
    currentRoundScore = 0
  } else {
    const actualDistance = Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(5 * floorDiff, 2))
    currentRoundScore = (maxScore - (actualDistance * maxScore) / distanceForZeroScore) * (timerSeconds.value / 10)
  }
  if (currentRoundScore > maxScore) {
    currentRoundScore = maxScore
  }
  roundScores[guessIndex.value - 1] = Math.floor(currentRoundScore)
  console.log('current round score: ', currentRoundScore)

  if (currentRoundScore > score_boundary && floorDiff == 0) {
    correctGuess = true
    correctGuesses += 1
  } else correctGuess = false

  totalTime += 30 - timerSeconds.value
}

function getHorizontalDistance() {
  const R = 6371000 // Radius of the Earth in meters
  const toRadians = (degrees: number) => degrees * (Math.PI / 180)
  const dLat = toRadians(markerPosition.lat - actualPosition.lat)
  const dLon = toRadians(markerPosition.lng - actualPosition.lng)

  const lat1 = toRadians(actualPosition.lat)
  const lat2 = toRadians(markerPosition.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = Math.floor(R * c) // Distance in meters
  return distance
}

function updateGuessMarkerPosition(event: google.maps.MapMouseEvent) {
  markerPosition = {
    lat: event.latLng?.lat() || 0,
    lng: event.latLng?.lng() || 0,
  }
  guessMarkerOption.value = {
    ...guessMarkerOption.value,
    position: markerPosition,
    visible: true,
  }
  center = {
    lat: (markerPosition.lat + actualPosition.lat) / 2,
    lng: (markerPosition.lng + actualPosition.lng) / 2,
  }

  // 16 = 500m
  // 17 = 300m
  // 18 = 100m
  // 19 = 50m

  resultZoom = 15.95 / (1 - 0.2103 * Math.exp(-0.005292 * getHorizontalDistance()))
}

const { open, close } = useModal({
  component: GuessResultsModal,
  attrs: {
    image: image,
    guess: guess,
    mapConfig: mapConfig,
    guessMarkerOption: guessMarkerOption,
    actualMarkerOption: actualMarkerOption,
    onConfirm() {
      close()
    },
    onClosed() {
      mapExpanded.value = false
      markerPosition = { lat: 0, lng: 0 }
      guessMarkerOption.value = {
        ...guessMarkerOption.value,
        visible: false,
      }
      selectedFloor.value = '1F'
      startNextRound()
    },
  },
})

async function doGuess() {
  if (markerPosition.lat === 0 && markerPosition.lng === 0) {
    mapExpanded.value = true;
    return
  } // disable guess when marker not moved
  evaluate()
  open()
}

async function startNextRound() {
  guessIndex.value++
  image.value = await getRandomImage()
  console.log('image: ', image.value)
  if (isUndefined(image.value)) {
    await sendData()
    UserInfo.value.corrects = correctGuesses
    UserInfo.value.scores = roundScores
    // show result here
    router.push('/score')
    return
  }
  if (image.value) {
    actualPosition = image.value.coordinate
  }
  actualMarkerOption.value = {
    ...actualMarkerOption.value,
    position: actualPosition,
  }
}

onMounted(async () => {
  const { Size } = (await google.maps.importLibrary('core')) as google.maps.CoreLibrary
  guessMarkerOption.value.icon = {
    url: guessMarkerImg,
    scaledSize: new Size(40, 40),
  }
  actualMarkerOption.value.icon = {
    url: actualMarkerImg,
    scaledSize: new Size(40, 40),
  }
  await startNextRound()
})

onUnmounted(() => {
  clearInterval(timerInterval)
  guessIndex.value = 0
  resetGuessedImageSet()
})
</script>

<template>
  <div class="game">
    <DynamicImage class="image-container" :image="image" v-on:image-loaded="startTimer" />
    <div class="timer game-control" v-text="timerText"></div>
    <div class="stage game-control" v-text="stageText"></div>
    <button class="guess game-control" @click="doGuess">Guess</button>
    <select class="floor game-control" v-model="selectedFloor" aria-label="Floor">
      <option>1F</option>
      <option>2F</option>
      <option>3F</option>
      <option>4F</option>
      <option>5F</option>
      <option>6F</option>
      <option>7F</option>
      <option>8F</option>
      <option>9F</option>
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
          @click="updateGuessMarkerPosition"
        >
          <Marker id="marker" :options="guessMarkerOption" />
        </GoogleMap>
      </div>
      <label class="map-expanded" aria-label="Resize map">
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
  text-align: center;
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
    clip-path: polygon(
      calc(0% + 0px) calc(0% + 0px),
      calc(1.11% + 0px) calc(0% + 0px),
      calc(2.22% + 0px) calc(0% + 0px),
      calc(3.33% + 0px) calc(0% + 0px),
      calc(4.44% + 0px) calc(0% + 0px),
      calc(5.56% + 0px) calc(0% + 0px),
      calc(6.67% + 0px) calc(0% + 0px),
      calc(7.78% + 0px) calc(0% + 0px),
      calc(8.89% + 0px) calc(0% + 0px),
      calc(10% + 0px) calc(0% + 0px),
      calc(11.11% + 0px) calc(0% + 0px),
      calc(12.22% + 0px) calc(0% + 0px),
      calc(13.33% + 0px) calc(0% + 0px),
      calc(14.44% + 0px) calc(0% + 0px),
      calc(15.56% + 0px) calc(0% + 0px),
      calc(16.67% + 0px) calc(0% + 0px),
      calc(17.78% + 0px) calc(0% + 0px),
      calc(18.89% + 0px) calc(0% + 0px),
      calc(20% + 0px) calc(0% + 0px),
      calc(21.11% + 0px) calc(0% + 0px),
      calc(22.22% + 0px) calc(0% + 0px),
      calc(23.33% + 0px) calc(0% + 0px),
      calc(24.44% + 0px) calc(0% + 0px),
      calc(25.56% + 0px) calc(0% + 0px),
      calc(26.67% + 0px) calc(0% + 0px),
      calc(27.78% + 0px) calc(0% + 0px),
      calc(28.89% + 0px) calc(0% + 0px),
      calc(30% + 0px) calc(0% + 0px),
      calc(31.11% + 0px) calc(0% + 0px),
      calc(32.22% + 0px) calc(0% + 0px),
      calc(33.33% + 0px) calc(0% + 0px),
      calc(34.44% + 0px) calc(0% + 0px),
      calc(35.56% + 0px) calc(0% + 0px),
      calc(36.67% + 0px) calc(0% + 0px),
      calc(37.78% + 0px) calc(0% + 0px),
      calc(38.89% + 0px) calc(0% + 0px),
      calc(40% + 0px) calc(0% + 0px),
      calc(41.11% + 0px) calc(0% + 0px),
      calc(42.22% + 0px) calc(0% + 0px),
      calc(43.33% + 0px) calc(0% + 0px),
      calc(44.44% + 0px) calc(0% + 0px),
      calc(45.56% + 0px) calc(0% + 0px),
      calc(46.67% + 0px) calc(0% + 0px),
      calc(47.78% + 0px) calc(0% + 0px),
      calc(48.89% + 0px) calc(0% + 0px),
      calc(50% + -0px) calc(0% + 0px),
      calc(51.11% + -0px) calc(0% + 0px),
      calc(52.22% + -0px) calc(0% + 0px),
      calc(53.33% + -0px) calc(0% + 0px),
      calc(54.44% + -0px) calc(0% + 0px),
      calc(55.56% + -0px) calc(0% + 0px),
      calc(56.67% + -0px) calc(0% + 0px),
      calc(57.78% + -0px) calc(0% + 0px),
      calc(58.89% + -0px) calc(0% + 0px),
      calc(60% + -0px) calc(0% + 0px),
      calc(61.11% + -0px) calc(0% + 0px),
      calc(62.22% + -0px) calc(0% + 0px),
      calc(63.33% + -0px) calc(0% + 0px),
      calc(64.44% + -0px) calc(0% + 0px),
      calc(65.56% + -0px) calc(0% + 0px),
      calc(66.67% + -0px) calc(0% + 0px),
      calc(67.78% + -0px) calc(0% + 0px),
      calc(68.89% + -0px) calc(0% + 0px),
      calc(70% + -0px) calc(0% + 0px),
      calc(71.11% + -0px) calc(0% + 0px),
      calc(72.22% + -0px) calc(0% + 0px),
      calc(73.33% + -0px) calc(0% + 0px),
      calc(74.44% + -0px) calc(0% + 0px),
      calc(75.56% + -0px) calc(0% + 0px),
      calc(76.67% + -0px) calc(0% + 0px),
      calc(77.78% + -0px) calc(0% + 0px),
      calc(78.89% + -0px) calc(0% + 0px),
      calc(80% + -0px) calc(0% + 0px),
      calc(81.11% + -0px) calc(0% + 0px),
      calc(82.22% + -0px) calc(0% + 0px),
      calc(83.33% + -0px) calc(0% + 0px),
      calc(84.44% + -0px) calc(0% + 0px),
      calc(85.56% + -0px) calc(0% + 0px),
      calc(86.67% + -0px) calc(0% + 0px),
      calc(87.78% + -0px) calc(0% + 0px),
      calc(88.89% + -0px) calc(0% + 0px),
      calc(90% + -0px) calc(0% + 0px),
      calc(91.11% + -0px) calc(0% + 0px),
      calc(92.22% + -0px) calc(0% + 0px),
      calc(93.33% + -0px) calc(0% + 0px),
      calc(94.44% + -0px) calc(0% + 0px),
      calc(95.56% + -0px) calc(0% + 0px),
      calc(96.67% + -0px) calc(0% + 0px),
      calc(97.78% + -0px) calc(0% + 0px),
      calc(98.89% + -0px) calc(0% + 0px),
      calc(100% + -0px) calc(0% + 0px),
      calc(100% + -0px) calc(1.11% + 0px),
      calc(100% + -0px) calc(2.22% + 0px),
      calc(100% + -0px) calc(3.33% + 0px),
      calc(100% + -0px) calc(4.44% + 0px),
      calc(100% + -0px) calc(5.56% + 0px),
      calc(100% + -0px) calc(6.67% + 0px),
      calc(100% + -0px) calc(7.78% + 0px),
      calc(100% + -0px) calc(8.89% + 0px),
      calc(100% + -0px) calc(10% + 0px),
      calc(100% + -0px) calc(11.11% + 0px),
      calc(100% + -0px) calc(12.22% + 0px),
      calc(100% + -0px) calc(13.33% + 0px),
      calc(100% + -0px) calc(14.44% + 0px),
      calc(100% + -0px) calc(15.56% + 0px),
      calc(100% + -0px) calc(16.67% + 0px),
      calc(100% + -0px) calc(17.78% + 0px),
      calc(100% + -0px) calc(18.89% + 0px),
      calc(100% + -0px) calc(20% + 0px),
      calc(100% + -0px) calc(21.11% + 0px),
      calc(100% + -0px) calc(22.22% + 0px),
      calc(100% + -0px) calc(23.33% + 0px),
      calc(100% + -0px) calc(24.44% + 0px),
      calc(100% + -0px) calc(25.56% + 0px),
      calc(100% + -0px) calc(26.67% + 0px),
      calc(100% + -0px) calc(27.78% + 0px),
      calc(100% + -0px) calc(28.89% + 0px),
      calc(100% + -0px) calc(30% + 0px),
      calc(100% + -0px) calc(31.11% + 0px),
      calc(100% + -0px) calc(32.22% + 0px),
      calc(100% + -0px) calc(33.33% + 0px),
      calc(100% + -0px) calc(34.44% + 0px),
      calc(100% + -0px) calc(35.56% + 0px),
      calc(100% + -0px) calc(36.67% + 0px),
      calc(100% + -0px) calc(37.78% + 0px),
      calc(100% + -0px) calc(38.89% + 0px),
      calc(100% + -0px) calc(40% + 0px),
      calc(100% + -0px) calc(41.11% + 0px),
      calc(100% + -0px) calc(42.22% + 0px),
      calc(100% + -0px) calc(43.33% + 0px),
      calc(100% + -0px) calc(44.44% + 0px),
      calc(100% + -0px) calc(45.56% + 0px),
      calc(100% + -0px) calc(46.67% + 0px),
      calc(100% + -0px) calc(47.78% + 0px),
      calc(100% + -0px) calc(48.89% + 0px),
      calc(100% + -0px) calc(50% + -0px),
      calc(100% + -0px) calc(51.11% + -0px),
      calc(100% + -0px) calc(52.22% + -0px),
      calc(100% + -0px) calc(53.33% + -0px),
      calc(100% + -0px) calc(54.44% + -0px),
      calc(100% + -0px) calc(55.56% + -0px),
      calc(100% + -0px) calc(56.67% + -0px),
      calc(100% + -0px) calc(57.78% + -0px),
      calc(100% + -0px) calc(58.89% + -0px),
      calc(100% + -0px) calc(60% + -0px),
      calc(100% + -0px) calc(61.11% + -0px),
      calc(100% + -0px) calc(62.22% + -0px),
      calc(100% + -0px) calc(63.33% + -0px),
      calc(100% + -0px) calc(64.44% + -0px),
      calc(100% + -0px) calc(65.56% + -0px),
      calc(100% + -0px) calc(66.67% + -0px),
      calc(100% + -0px) calc(67.78% + -0px),
      calc(100% + -0px) calc(68.89% + -0px),
      calc(100% + -0px) calc(70% + -0px),
      calc(100% + -0px) calc(71.11% + -0px),
      calc(100% + -0px) calc(72.22% + -0px),
      calc(100% + -0px) calc(73.33% + -0px),
      calc(100% + -0px) calc(74.44% + -0px),
      calc(100% + -0px) calc(75.56% + -0px),
      calc(100% + -0px) calc(76.67% + -0px),
      calc(100% + -0px) calc(77.78% + -0px),
      calc(100% + -0px) calc(78.89% + -0px),
      calc(100% + -0px) calc(80% + -0px),
      calc(100% + -0px) calc(81.11% + -0px),
      calc(100% + -0px) calc(82.22% + -0px),
      calc(100% + -0px) calc(83.33% + -0px),
      calc(100% + -0px) calc(84.44% + -0px),
      calc(100% + -0px) calc(85.56% + -0px),
      calc(100% + -0px) calc(86.67% + -0px),
      calc(100% + -0px) calc(87.78% + -0px),
      calc(100% + -0px) calc(88.89% + -0px),
      calc(100% + -0px) calc(90% + -0px),
      calc(100% + -0px) calc(91.11% + -0px),
      calc(100% + -0px) calc(92.22% + -0px),
      calc(100% + -0px) calc(93.33% + -0px),
      calc(100% + -0px) calc(94.44% + -0px),
      calc(100% + -0px) calc(95.56% + -0px),
      calc(100% + -0px) calc(96.67% + -0px),
      calc(100% + -0px) calc(97.78% + -0px),
      calc(100% + -0px) calc(98.89% + -0px),
      calc(100% + -0px) calc(100% + -0px),
      calc(98.89% + -0px) calc(100% + -0px),
      calc(97.78% + -0px) calc(100% + -0px),
      calc(96.67% + -0px) calc(100% + -0px),
      calc(95.56% + -0px) calc(100% + -0px),
      calc(94.44% + -0px) calc(100% + -0px),
      calc(93.33% + -0px) calc(100% + -0px),
      calc(92.22% + -0px) calc(100% + -0px),
      calc(91.11% + -0px) calc(100% + -0px),
      calc(90% + -0px) calc(100% + -0px),
      calc(88.89% + -0px) calc(100% + -0px),
      calc(87.78% + -0px) calc(100% + -0px),
      calc(86.67% + -0px) calc(100% + -0px),
      calc(85.56% + -0px) calc(100% + -0px),
      calc(84.44% + -0px) calc(100% + -0px),
      calc(83.33% + -0px) calc(100% + -0px),
      calc(82.22% + -0px) calc(100% + -0px),
      calc(81.11% + -0px) calc(100% + -0px),
      calc(80% + -0px) calc(100% + -0px),
      calc(78.89% + -0px) calc(100% + -0px),
      calc(77.78% + -0px) calc(100% + -0px),
      calc(76.67% + -0px) calc(100% + -0px),
      calc(75.56% + -0px) calc(100% + -0px),
      calc(74.44% + -0px) calc(100% + -0px),
      calc(73.33% + -0px) calc(100% + -0px),
      calc(72.22% + -0px) calc(100% + -0px),
      calc(71.11% + -0px) calc(100% + -0px),
      calc(70% + -0px) calc(100% + -0px),
      calc(68.89% + -0px) calc(100% + -0px),
      calc(67.78% + -0px) calc(100% + -0px),
      calc(66.67% + -0px) calc(100% + -0px),
      calc(65.56% + -0px) calc(100% + -0px),
      calc(64.44% + -0px) calc(100% + -0px),
      calc(63.33% + -0px) calc(100% + -0px),
      calc(62.22% + -0px) calc(100% + -0px),
      calc(61.11% + -0px) calc(100% + -0px),
      calc(60% + -0px) calc(100% + -0px),
      calc(58.89% + -0px) calc(100% + -0px),
      calc(57.78% + -0px) calc(100% + -0px),
      calc(56.67% + -0px) calc(100% + -0px),
      calc(55.56% + -0px) calc(100% + -0px),
      calc(54.44% + -0px) calc(100% + -0px),
      calc(53.33% + -0px) calc(100% + -0px),
      calc(52.22% + -0px) calc(100% + -0px),
      calc(51.11% + -0px) calc(100% + -0px),
      calc(50% + -0px) calc(100% + -0px),
      calc(48.89% + 0px) calc(100% + -0px),
      calc(47.78% + 0px) calc(100% + -0px),
      calc(46.67% + 0px) calc(100% + -0px),
      calc(45.56% + 0px) calc(100% + -0px),
      calc(44.44% + 0px) calc(100% + -0px),
      calc(43.33% + 0px) calc(100% + -0px),
      calc(42.22% + 0px) calc(100% + -0px),
      calc(41.11% + 0px) calc(100% + -0px),
      calc(40% + 0px) calc(100% + -0px),
      calc(38.89% + 0px) calc(100% + -0px),
      calc(37.78% + 0px) calc(100% + -0px),
      calc(36.67% + 0px) calc(100% + -0px),
      calc(35.56% + 0px) calc(100% + -0px),
      calc(34.44% + 0px) calc(100% + -0px),
      calc(33.33% + 0px) calc(100% + -0px),
      calc(32.22% + 0px) calc(100% + -0px),
      calc(31.11% + 0px) calc(100% + -0px),
      calc(30% + 0px) calc(100% + -0px),
      calc(28.89% + 0px) calc(100% + -0px),
      calc(27.78% + 0px) calc(100% + -0px),
      calc(26.67% + 0px) calc(100% + -0px),
      calc(25.56% + 0px) calc(100% + -0px),
      calc(24.44% + 0px) calc(100% + -0px),
      calc(23.33% + 0px) calc(100% + -0px),
      calc(22.22% + 0px) calc(100% + -0px),
      calc(21.11% + 0px) calc(100% + -0px),
      calc(20% + 0px) calc(100% + -0px),
      calc(18.89% + 0px) calc(100% + -0px),
      calc(17.78% + 0px) calc(100% + -0px),
      calc(16.67% + 0px) calc(100% + -0px),
      calc(15.56% + 0px) calc(100% + -0px),
      calc(14.44% + 0px) calc(100% + -0px),
      calc(13.33% + 0px) calc(100% + -0px),
      calc(12.22% + 0px) calc(100% + -0px),
      calc(11.11% + 0px) calc(100% + -0px),
      calc(10% + 0px) calc(100% + -0px),
      calc(8.89% + 0px) calc(100% + -0px),
      calc(7.78% + 0px) calc(100% + -0px),
      calc(6.67% + 0px) calc(100% + -0px),
      calc(5.56% + 0px) calc(100% + -0px),
      calc(4.44% + 0px) calc(100% + -0px),
      calc(3.33% + 0px) calc(100% + -0px),
      calc(2.22% + 0px) calc(100% + -0px),
      calc(1.11% + 0px) calc(100% + -0px),
      calc(0% + 0px) calc(100% + -0px),
      calc(0% + 0px) calc(98.89% + -0px),
      calc(0% + 0px) calc(97.78% + -0px),
      calc(0% + 0px) calc(96.67% + -0px),
      calc(0% + 0px) calc(95.56% + -0px),
      calc(0% + 0px) calc(94.44% + -0px),
      calc(0% + 0px) calc(93.33% + -0px),
      calc(0% + 0px) calc(92.22% + -0px),
      calc(0% + 0px) calc(91.11% + -0px),
      calc(0% + 0px) calc(90% + -0px),
      calc(0% + 0px) calc(88.89% + -0px),
      calc(0% + 0px) calc(87.78% + -0px),
      calc(0% + 0px) calc(86.67% + -0px),
      calc(0% + 0px) calc(85.56% + -0px),
      calc(0% + 0px) calc(84.44% + -0px),
      calc(0% + 0px) calc(83.33% + -0px),
      calc(0% + 0px) calc(82.22% + -0px),
      calc(0% + 0px) calc(81.11% + -0px),
      calc(0% + 0px) calc(80% + -0px),
      calc(0% + 0px) calc(78.89% + -0px),
      calc(0% + 0px) calc(77.78% + -0px),
      calc(0% + 0px) calc(76.67% + -0px),
      calc(0% + 0px) calc(75.56% + -0px),
      calc(0% + 0px) calc(74.44% + -0px),
      calc(0% + 0px) calc(73.33% + -0px),
      calc(0% + 0px) calc(72.22% + -0px),
      calc(0% + 0px) calc(71.11% + -0px),
      calc(0% + 0px) calc(70% + -0px),
      calc(0% + 0px) calc(68.89% + -0px),
      calc(0% + 0px) calc(67.78% + -0px),
      calc(0% + 0px) calc(66.67% + -0px),
      calc(0% + 0px) calc(65.56% + -0px),
      calc(0% + 0px) calc(64.44% + -0px),
      calc(0% + 0px) calc(63.33% + -0px),
      calc(0% + 0px) calc(62.22% + -0px),
      calc(0% + 0px) calc(61.11% + -0px),
      calc(0% + 0px) calc(60% + -0px),
      calc(0% + 0px) calc(58.89% + -0px),
      calc(0% + 0px) calc(57.78% + -0px),
      calc(0% + 0px) calc(56.67% + -0px),
      calc(0% + 0px) calc(55.56% + -0px),
      calc(0% + 0px) calc(54.44% + -0px),
      calc(0% + 0px) calc(53.33% + -0px),
      calc(0% + 0px) calc(52.22% + -0px),
      calc(0% + 0px) calc(51.11% + -0px),
      calc(0% + 0px) calc(50% + -0px),
      calc(0% + 0px) calc(48.89% + 0px),
      calc(0% + 0px) calc(47.78% + 0px),
      calc(0% + 0px) calc(46.67% + 0px),
      calc(0% + 0px) calc(45.56% + 0px),
      calc(0% + 0px) calc(44.44% + 0px),
      calc(0% + 0px) calc(43.33% + 0px),
      calc(0% + 0px) calc(42.22% + 0px),
      calc(0% + 0px) calc(41.11% + 0px),
      calc(0% + 0px) calc(40% + 0px),
      calc(0% + 0px) calc(38.89% + 0px),
      calc(0% + 0px) calc(37.78% + 0px),
      calc(0% + 0px) calc(36.67% + 0px),
      calc(0% + 0px) calc(35.56% + 0px),
      calc(0% + 0px) calc(34.44% + 0px),
      calc(0% + 0px) calc(33.33% + 0px),
      calc(0% + 0px) calc(32.22% + 0px),
      calc(0% + 0px) calc(31.11% + 0px),
      calc(0% + 0px) calc(30% + 0px),
      calc(0% + 0px) calc(28.89% + 0px),
      calc(0% + 0px) calc(27.78% + 0px),
      calc(0% + 0px) calc(26.67% + 0px),
      calc(0% + 0px) calc(25.56% + 0px),
      calc(0% + 0px) calc(24.44% + 0px),
      calc(0% + 0px) calc(23.33% + 0px),
      calc(0% + 0px) calc(22.22% + 0px),
      calc(0% + 0px) calc(21.11% + 0px),
      calc(0% + 0px) calc(20% + 0px),
      calc(0% + 0px) calc(18.89% + 0px),
      calc(0% + 0px) calc(17.78% + 0px),
      calc(0% + 0px) calc(16.67% + 0px),
      calc(0% + 0px) calc(15.56% + 0px),
      calc(0% + 0px) calc(14.44% + 0px),
      calc(0% + 0px) calc(13.33% + 0px),
      calc(0% + 0px) calc(12.22% + 0px),
      calc(0% + 0px) calc(11.11% + 0px),
      calc(0% + 0px) calc(10% + 0px),
      calc(0% + 0px) calc(8.89% + 0px),
      calc(0% + 0px) calc(7.78% + 0px),
      calc(0% + 0px) calc(6.67% + 0px),
      calc(0% + 0px) calc(5.56% + 0px),
      calc(0% + 0px) calc(4.44% + 0px),
      calc(0% + 0px) calc(3.33% + 0px),
      calc(0% + 0px) calc(2.22% + 0px),
      calc(0% + 0px) calc(1.11% + 0px)
    );
  }

  &:has(.map-expanded input:checked) .map {
    clip-path: polygon(
      calc(0% + 5px) calc(0% + 5px),
      calc(1.11% + 4.89px) calc(0% + 5px),
      calc(2.22% + 4.78px) calc(0% + 5px),
      calc(3.33% + 4.67px) calc(0% + 5px),
      calc(4.44% + 4.56px) calc(0% + 5px),
      calc(5.56% + 4.44px) calc(0% + 5px),
      calc(6.67% + 4.33px) calc(0% + 5px),
      calc(7.78% + 4.22px) calc(0% + 5px),
      calc(8.89% + 4.11px) calc(0% + 5px),
      calc(10% + 4px) calc(0% + 5px),
      calc(11.11% + 3.89px) calc(0% + 5px),
      calc(12.22% + 3.78px) calc(0% + 5px),
      calc(13.33% + 3.67px) calc(0% + 5px),
      calc(14.44% + 3.56px) calc(0% + 5px),
      calc(15.56% + 3.44px) calc(0% + 5px),
      calc(16.67% + 3.33px) calc(0% + 5px),
      calc(17.78% + 3.22px) calc(0% + 5px),
      calc(18.89% + 3.11px) calc(0% + 5px),
      calc(20% + 3px) calc(0% + 5px),
      calc(21.11% + 2.89px) calc(0% + 5px),
      calc(22.22% + 2.78px) calc(0% + 5px),
      calc(23.33% + 2.67px) calc(0% + 5px),
      calc(24.44% + 2.56px) calc(0% + 5px),
      calc(25.56% + 2.44px) calc(0% + 5px),
      calc(26.67% + 2.33px) calc(0% + 5px),
      calc(27.78% + 2.22px) calc(0% + 5px),
      calc(28.89% + 2.11px) calc(0% + 5px),
      calc(30% + 2px) calc(0% + 5px),
      calc(31.11% + 1.89px) calc(0% + 5px),
      calc(32.22% + 1.78px) calc(0% + 5px),
      calc(33.33% + 1.67px) calc(0% + 5px),
      calc(34.44% + 1.56px) calc(0% + 5px),
      calc(35.56% + 1.44px) calc(0% + 5px),
      calc(36.67% + 1.33px) calc(0% + 5px),
      calc(37.78% + 1.22px) calc(0% + 5px),
      calc(38.89% + 1.11px) calc(0% + 5px),
      calc(40% + 1px) calc(0% + 5px),
      calc(41.11% + 0.89px) calc(0% + 5px),
      calc(42.22% + 0.78px) calc(0% + 5px),
      calc(43.33% + 0.67px) calc(0% + 5px),
      calc(44.44% + 0.56px) calc(0% + 5px),
      calc(45.56% + 0.44px) calc(0% + 5px),
      calc(46.67% + 0.33px) calc(0% + 5px),
      calc(47.78% + 0.22px) calc(0% + 5px),
      calc(48.89% + 0.11px) calc(0% + 5px),
      calc(50% + -0px) calc(0% + 5px),
      calc(51.11% + -0.11px) calc(0% + 5px),
      calc(52.22% + -0.22px) calc(0% + 5px),
      calc(53.33% + -0.33px) calc(0% + 5px),
      calc(54.44% + -0.44px) calc(0% + 5px),
      calc(55.56% + -0.56px) calc(0% + 5px),
      calc(56.67% + -0.67px) calc(0% + 5px),
      calc(57.78% + -0.78px) calc(0% + 5px),
      calc(58.89% + -0.89px) calc(0% + 5px),
      calc(60% + -1px) calc(0% + 5px),
      calc(61.11% + -1.11px) calc(0% + 5px),
      calc(62.22% + -1.22px) calc(0% + 5px),
      calc(63.33% + -1.33px) calc(0% + 5px),
      calc(64.44% + -1.44px) calc(0% + 5px),
      calc(65.56% + -1.56px) calc(0% + 5px),
      calc(66.67% + -1.67px) calc(0% + 5px),
      calc(67.78% + -1.78px) calc(0% + 5px),
      calc(68.89% + -1.89px) calc(0% + 5px),
      calc(70% + -2px) calc(0% + 5px),
      calc(71.11% + -2.11px) calc(0% + 5px),
      calc(72.22% + -2.22px) calc(0% + 5px),
      calc(73.33% + -2.33px) calc(0% + 5px),
      calc(74.44% + -2.44px) calc(0% + 5px),
      calc(75.56% + -2.56px) calc(0% + 5px),
      calc(76.67% + -2.67px) calc(0% + 5px),
      calc(77.78% + -2.78px) calc(0% + 5px),
      calc(78.89% + -2.89px) calc(0% + 5px),
      calc(80% + -3px) calc(0% + 5px),
      calc(81.11% + -3.11px) calc(0% + 5px),
      calc(82.22% + -3.22px) calc(0% + 5px),
      calc(83.33% + -3.33px) calc(0% + 5px),
      calc(84.44% + -3.44px) calc(0% + 5px),
      calc(85.56% + -3.56px) calc(0% + 5px),
      calc(86.67% + -3.67px) calc(0% + 5px),
      calc(87.78% + -3.78px) calc(0% + 5px),
      calc(88.89% + -3.89px) calc(0% + 5px),
      calc(90% + -4px) calc(0% + 5px),
      calc(91.11% + -4.11px) calc(0% + 5px),
      calc(92.22% + -4.22px) calc(0% + 5px),
      calc(93.33% + -4.33px) calc(0% + 5px),
      calc(94.44% + -4.44px) calc(0% + 5px),
      calc(95.56% + -4.56px) calc(0% + 5px),
      calc(96.67% + -4.67px) calc(0% + 5px),
      calc(97.78% + -4.78px) calc(0% + 5px),
      calc(98.89% + -4.89px) calc(0% + 5px),
      calc(100% + -5px) calc(0% + 5px),
      calc(100% + -5px) calc(1.11% + 4.89px),
      calc(100% + -5px) calc(2.22% + 4.78px),
      calc(100% + -5px) calc(3.33% + 4.67px),
      calc(100% + -5px) calc(4.44% + 4.56px),
      calc(100% + -5px) calc(5.56% + 4.44px),
      calc(100% + -5px) calc(6.67% + 4.33px),
      calc(100% + -5px) calc(7.78% + 4.22px),
      calc(100% + -5px) calc(8.89% + 4.11px),
      calc(100% + -5px) calc(10% + 4px),
      calc(100% + -5px) calc(11.11% + 3.89px),
      calc(100% + -5px) calc(12.22% + 3.78px),
      calc(100% + -5px) calc(13.33% + 3.67px),
      calc(100% + -5px) calc(14.44% + 3.56px),
      calc(100% + -5px) calc(15.56% + 3.44px),
      calc(100% + -5px) calc(16.67% + 3.33px),
      calc(100% + -5px) calc(17.78% + 3.22px),
      calc(100% + -5px) calc(18.89% + 3.11px),
      calc(100% + -5px) calc(20% + 3px),
      calc(100% + -5px) calc(21.11% + 2.89px),
      calc(100% + -5px) calc(22.22% + 2.78px),
      calc(100% + -5px) calc(23.33% + 2.67px),
      calc(100% + -5px) calc(24.44% + 2.56px),
      calc(100% + -5px) calc(25.56% + 2.44px),
      calc(100% + -5px) calc(26.67% + 2.33px),
      calc(100% + -5px) calc(27.78% + 2.22px),
      calc(100% + -5px) calc(28.89% + 2.11px),
      calc(100% + -5px) calc(30% + 2px),
      calc(100% + -5px) calc(31.11% + 1.89px),
      calc(100% + -5px) calc(32.22% + 1.78px),
      calc(100% + -5px) calc(33.33% + 1.67px),
      calc(100% + -5px) calc(34.44% + 1.56px),
      calc(100% + -5px) calc(35.56% + 1.44px),
      calc(100% + -5px) calc(36.67% + 1.33px),
      calc(100% + -5px) calc(37.78% + 1.22px),
      calc(100% + -5px) calc(38.89% + 1.11px),
      calc(100% + -5px) calc(40% + 1px),
      calc(100% + -5px) calc(41.11% + 0.89px),
      calc(100% + -5px) calc(42.22% + 0.78px),
      calc(100% + -5px) calc(43.33% + 0.67px),
      calc(100% + -5px) calc(44.44% + 0.56px),
      calc(100% + -5px) calc(45.56% + 0.44px),
      calc(100% + -5px) calc(46.67% + 0.33px),
      calc(100% + -5px) calc(47.78% + 0.22px),
      calc(100% + -5px) calc(48.89% + 0.11px),
      calc(100% + -5px) calc(50% + -0px),
      calc(100% + -5px) calc(51.11% + -0.11px),
      calc(100% + -5px) calc(52.22% + -0.22px),
      calc(100% + -5px) calc(53.33% + -0.33px),
      calc(100% + -5px) calc(54.44% + -0.44px),
      calc(100% + -5px) calc(55.56% + -0.56px),
      calc(100% + -5px) calc(56.67% + -0.67px),
      calc(100% + -5px) calc(57.78% + -0.78px),
      calc(100% + -5px) calc(58.89% + -0.89px),
      calc(100% + -5px) calc(60% + -1px),
      calc(100% + -5px) calc(61.11% + -1.11px),
      calc(100% + -5px) calc(62.22% + -1.22px),
      calc(100% + -5px) calc(63.33% + -1.33px),
      calc(100% + -5px) calc(64.44% + -1.44px),
      calc(100% + -5px) calc(65.56% + -1.56px),
      calc(100% + -5px) calc(66.67% + -1.67px),
      calc(100% + -5px) calc(67.78% + -1.78px),
      calc(100% + -5px) calc(68.89% + -1.89px),
      calc(100% + -5px) calc(70% + -2px),
      calc(100% + -5px) calc(71.11% + -2.11px),
      calc(100% + -5px) calc(72.22% + -2.22px),
      calc(100% + -5px) calc(73.33% + -2.33px),
      calc(100% + -5px) calc(74.44% + -2.44px),
      calc(100% + -5px) calc(75.56% + -2.56px),
      calc(100% + -5px) calc(76.67% + -2.67px),
      calc(100% + -5px) calc(77.78% + -2.78px),
      calc(100% + -5px) calc(78.89% + -2.89px),
      calc(100% + -5px) calc(80% + -3px),
      calc(100% + -5px) calc(81.11% + -3.11px),
      calc(100% + -5px) calc(82.22% + -3.22px),
      calc(100% + -5px) calc(83.33% + -3.33px),
      calc(100% + -5px) calc(84.44% + -3.44px),
      calc(100% + -5px) calc(85.56% + -3.56px),
      calc(100% + -5px) calc(86.67% + -3.67px),
      calc(100% + -5px) calc(87.78% + -3.78px),
      calc(100% + -5px) calc(88.89% + -3.89px),
      calc(100% + -5px) calc(90% + -4px),
      calc(100% + -5px) calc(91.11% + -4.11px),
      calc(100% + -5px) calc(92.22% + -4.22px),
      calc(100% + -5px) calc(93.33% + -4.33px),
      calc(100% + -5px) calc(94.44% + -4.44px),
      calc(100% + -5px) calc(95.56% + -4.56px),
      calc(100% + -5px) calc(96.67% + -4.67px),
      calc(100% + -5px) calc(97.78% + -4.78px),
      calc(100% + -5px) calc(98.89% + -4.89px),
      calc(100% + -5px) calc(100% + -5px),
      calc(98.89% + -4.89px) calc(100% + -5px),
      calc(97.78% + -4.78px) calc(100% + -5px),
      calc(96.67% + -4.67px) calc(100% + -5px),
      calc(95.56% + -4.56px) calc(100% + -5px),
      calc(94.44% + -4.44px) calc(100% + -5px),
      calc(93.33% + -4.33px) calc(100% + -5px),
      calc(92.22% + -4.22px) calc(100% + -5px),
      calc(91.11% + -4.11px) calc(100% + -5px),
      calc(90% + -4px) calc(100% + -5px),
      calc(88.89% + -3.89px) calc(100% + -5px),
      calc(87.78% + -3.78px) calc(100% + -5px),
      calc(86.67% + -3.67px) calc(100% + -5px),
      calc(85.56% + -3.56px) calc(100% + -5px),
      calc(84.44% + -3.44px) calc(100% + -5px),
      calc(83.33% + -3.33px) calc(100% + -5px),
      calc(82.22% + -3.22px) calc(100% + -5px),
      calc(81.11% + -3.11px) calc(100% + -5px),
      calc(80% + -3px) calc(100% + -5px),
      calc(78.89% + -2.89px) calc(100% + -5px),
      calc(77.78% + -2.78px) calc(100% + -5px),
      calc(76.67% + -2.67px) calc(100% + -5px),
      calc(75.56% + -2.56px) calc(100% + -5px),
      calc(74.44% + -2.44px) calc(100% + -5px),
      calc(73.33% + -2.33px) calc(100% + -5px),
      calc(72.22% + -2.22px) calc(100% + -5px),
      calc(71.11% + -2.11px) calc(100% + -5px),
      calc(70% + -2px) calc(100% + -5px),
      calc(68.89% + -1.89px) calc(100% + -5px),
      calc(67.78% + -1.78px) calc(100% + -5px),
      calc(66.67% + -1.67px) calc(100% + -5px),
      calc(65.56% + -1.56px) calc(100% + -5px),
      calc(64.44% + -1.44px) calc(100% + -5px),
      calc(63.33% + -1.33px) calc(100% + -5px),
      calc(62.22% + -1.22px) calc(100% + -5px),
      calc(61.11% + -1.11px) calc(100% + -5px),
      calc(60% + -1px) calc(100% + -5px),
      calc(58.89% + -0.89px) calc(100% + -5px),
      calc(57.78% + -0.78px) calc(100% + -5px),
      calc(56.67% + -0.67px) calc(100% + -5px),
      calc(55.56% + -0.56px) calc(100% + -5px),
      calc(54.44% + -0.44px) calc(100% + -5px),
      calc(53.33% + -0.33px) calc(100% + -5px),
      calc(52.22% + -0.22px) calc(100% + -5px),
      calc(51.11% + -0.11px) calc(100% + -5px),
      calc(50% + -0px) calc(100% + -5px),
      calc(48.89% + 0.11px) calc(100% + -5px),
      calc(47.78% + 0.22px) calc(100% + -5px),
      calc(46.67% + 0.33px) calc(100% + -5px),
      calc(45.56% + 0.44px) calc(100% + -5px),
      calc(44.44% + 0.56px) calc(100% + -5px),
      calc(43.33% + 0.67px) calc(100% + -5px),
      calc(42.22% + 0.78px) calc(100% + -5px),
      calc(41.11% + 0.89px) calc(100% + -5px),
      calc(40% + 1px) calc(100% + -5px),
      calc(38.89% + 1.11px) calc(100% + -5px),
      calc(37.78% + 1.22px) calc(100% + -5px),
      calc(36.67% + 1.33px) calc(100% + -5px),
      calc(35.56% + 1.44px) calc(100% + -5px),
      calc(34.44% + 1.56px) calc(100% + -5px),
      calc(33.33% + 1.67px) calc(100% + -5px),
      calc(32.22% + 1.78px) calc(100% + -5px),
      calc(31.11% + 1.89px) calc(100% + -5px),
      calc(30% + 2px) calc(100% + -5px),
      calc(28.89% + 2.11px) calc(100% + -5px),
      calc(27.78% + 2.22px) calc(100% + -5px),
      calc(26.67% + 2.33px) calc(100% + -5px),
      calc(25.56% + 2.44px) calc(100% + -5px),
      calc(24.44% + 2.56px) calc(100% + -5px),
      calc(23.33% + 2.67px) calc(100% + -5px),
      calc(22.22% + 2.78px) calc(100% + -5px),
      calc(21.11% + 2.89px) calc(100% + -5px),
      calc(20% + 3px) calc(100% + -5px),
      calc(18.89% + 3.11px) calc(100% + -5px),
      calc(17.78% + 3.22px) calc(100% + -5px),
      calc(16.67% + 3.33px) calc(100% + -5px),
      calc(15.56% + 3.44px) calc(100% + -5px),
      calc(14.44% + 3.56px) calc(100% + -5px),
      calc(13.33% + 3.67px) calc(100% + -5px),
      calc(12.22% + 3.78px) calc(100% + -5px),
      calc(11.11% + 3.89px) calc(100% + -5px),
      calc(10% + 4px) calc(100% + -5px),
      calc(8.89% + 4.11px) calc(100% + -5px),
      calc(7.78% + 4.22px) calc(100% + -5px),
      calc(6.67% + 4.33px) calc(100% + -5px),
      calc(5.56% + 4.44px) calc(100% + -5px),
      calc(4.44% + 4.56px) calc(100% + -5px),
      calc(3.33% + 4.67px) calc(100% + -5px),
      calc(2.22% + 4.78px) calc(100% + -5px),
      calc(1.11% + 4.89px) calc(100% + -5px),
      calc(0% + 5px) calc(100% + -5px),
      calc(0% + 5px) calc(98.89% + -4.89px),
      calc(0% + 5px) calc(97.78% + -4.78px),
      calc(0% + 5px) calc(96.67% + -4.67px),
      calc(0% + 5px) calc(95.56% + -4.56px),
      calc(0% + 5px) calc(94.44% + -4.44px),
      calc(0% + 5px) calc(93.33% + -4.33px),
      calc(0% + 5px) calc(92.22% + -4.22px),
      calc(0% + 5px) calc(91.11% + -4.11px),
      calc(0% + 5px) calc(90% + -4px),
      calc(0% + 5px) calc(88.89% + -3.89px),
      calc(0% + 5px) calc(87.78% + -3.78px),
      calc(0% + 5px) calc(86.67% + -3.67px),
      calc(0% + 5px) calc(85.56% + -3.56px),
      calc(0% + 5px) calc(84.44% + -3.44px),
      calc(0% + 5px) calc(83.33% + -3.33px),
      calc(0% + 5px) calc(82.22% + -3.22px),
      calc(0% + 5px) calc(81.11% + -3.11px),
      calc(0% + 5px) calc(80% + -3px),
      calc(0% + 5px) calc(78.89% + -2.89px),
      calc(0% + 5px) calc(77.78% + -2.78px),
      calc(0% + 5px) calc(76.67% + -2.67px),
      calc(0% + 5px) calc(75.56% + -2.56px),
      calc(0% + 5px) calc(74.44% + -2.44px),
      calc(0% + 5px) calc(73.33% + -2.33px),
      calc(0% + 5px) calc(72.22% + -2.22px),
      calc(0% + 5px) calc(71.11% + -2.11px),
      calc(0% + 5px) calc(70% + -2px),
      calc(0% + 5px) calc(68.89% + -1.89px),
      calc(0% + 5px) calc(67.78% + -1.78px),
      calc(0% + 5px) calc(66.67% + -1.67px),
      calc(0% + 5px) calc(65.56% + -1.56px),
      calc(0% + 5px) calc(64.44% + -1.44px),
      calc(0% + 5px) calc(63.33% + -1.33px),
      calc(0% + 5px) calc(62.22% + -1.22px),
      calc(0% + 5px) calc(61.11% + -1.11px),
      calc(0% + 5px) calc(60% + -1px),
      calc(0% + 5px) calc(58.89% + -0.89px),
      calc(0% + 5px) calc(57.78% + -0.78px),
      calc(0% + 5px) calc(56.67% + -0.67px),
      calc(0% + 5px) calc(55.56% + -0.56px),
      calc(0% + 5px) calc(54.44% + -0.44px),
      calc(0% + 5px) calc(53.33% + -0.33px),
      calc(0% + 5px) calc(52.22% + -0.22px),
      calc(0% + 5px) calc(51.11% + -0.11px),
      calc(0% + 5px) calc(50% + -0px),
      calc(0% + 5px) calc(48.89% + 0.11px),
      calc(0% + 5px) calc(47.78% + 0.22px),
      calc(0% + 5px) calc(46.67% + 0.33px),
      calc(0% + 5px) calc(45.56% + 0.44px),
      calc(0% + 5px) calc(44.44% + 0.56px),
      calc(0% + 5px) calc(43.33% + 0.67px),
      calc(0% + 5px) calc(42.22% + 0.78px),
      calc(0% + 5px) calc(41.11% + 0.89px),
      calc(0% + 5px) calc(40% + 1px),
      calc(0% + 5px) calc(38.89% + 1.11px),
      calc(0% + 5px) calc(37.78% + 1.22px),
      calc(0% + 5px) calc(36.67% + 1.33px),
      calc(0% + 5px) calc(35.56% + 1.44px),
      calc(0% + 5px) calc(34.44% + 1.56px),
      calc(0% + 5px) calc(33.33% + 1.67px),
      calc(0% + 5px) calc(32.22% + 1.78px),
      calc(0% + 5px) calc(31.11% + 1.89px),
      calc(0% + 5px) calc(30% + 2px),
      calc(0% + 5px) calc(28.89% + 2.11px),
      calc(0% + 5px) calc(27.78% + 2.22px),
      calc(0% + 5px) calc(26.67% + 2.33px),
      calc(0% + 5px) calc(25.56% + 2.44px),
      calc(0% + 5px) calc(24.44% + 2.56px),
      calc(0% + 5px) calc(23.33% + 2.67px),
      calc(0% + 5px) calc(22.22% + 2.78px),
      calc(0% + 5px) calc(21.11% + 2.89px),
      calc(0% + 5px) calc(20% + 3px),
      calc(0% + 5px) calc(18.89% + 3.11px),
      calc(0% + 5px) calc(17.78% + 3.22px),
      calc(0% + 5px) calc(16.67% + 3.33px),
      calc(0% + 5px) calc(15.56% + 3.44px),
      calc(0% + 5px) calc(14.44% + 3.56px),
      calc(0% + 5px) calc(13.33% + 3.67px),
      calc(0% + 5px) calc(12.22% + 3.78px),
      calc(0% + 5px) calc(11.11% + 3.89px),
      calc(0% + 5px) calc(10% + 4px),
      calc(0% + 5px) calc(8.89% + 4.11px),
      calc(0% + 5px) calc(7.78% + 4.22px),
      calc(0% + 5px) calc(6.67% + 4.33px),
      calc(0% + 5px) calc(5.56% + 4.44px),
      calc(0% + 5px) calc(4.44% + 4.56px),
      calc(0% + 5px) calc(3.33% + 4.67px),
      calc(0% + 5px) calc(2.22% + 4.78px),
      calc(0% + 5px) calc(1.11% + 4.89px)
    );
  }
}

.map {
  transition: clip-path 600ms;
  height: 100%;
  width: 100%;
  clip-path: polygon(
    calc(14.64% + 3.54px) calc(14.64% + 3.54px),
    calc(15.27% + 3.47px) calc(14.03% + 3.6px),
    calc(15.9% + 3.41px) calc(13.43% + 3.66px),
    calc(16.54% + 3.35px) calc(12.84% + 3.72px),
    calc(17.2% + 3.28px) calc(12.26% + 3.77px),
    calc(17.86% + 3.21px) calc(11.7% + 3.83px),
    calc(18.53% + 3.15px) calc(11.14% + 3.89px),
    calc(19.22% + 3.08px) calc(10.6% + 3.94px),
    calc(19.91% + 3.01px) calc(10.07% + 3.99px),
    calc(20.61% + 2.94px) calc(9.55% + 4.05px),
    calc(21.32% + 2.87px) calc(9.04% + 4.1px),
    calc(22.04% + 2.8px) calc(8.55% + 4.15px),
    calc(22.77% + 2.72px) calc(8.07% + 4.19px),
    calc(23.5% + 2.65px) calc(7.6% + 4.24px),
    calc(24.25% + 2.58px) calc(7.14% + 4.29px),
    calc(25% + 2.5px) calc(6.7% + 4.33px),
    calc(25.76% + 2.42px) calc(6.27% + 4.37px),
    calc(26.53% + 2.35px) calc(5.85% + 4.41px),
    calc(27.3% + 2.27px) calc(5.45% + 4.46px),
    calc(28.08% + 2.19px) calc(5.06% + 4.49px),
    calc(28.87% + 2.11px) calc(4.68% + 4.53px),
    calc(29.66% + 2.03px) calc(4.32% + 4.57px),
    calc(30.46% + 1.95px) calc(3.97% + 4.6px),
    calc(31.27% + 1.87px) calc(3.64% + 4.64px),
    calc(32.08% + 1.79px) calc(3.32% + 4.67px),
    calc(32.9% + 1.71px) calc(3.02% + 4.7px),
    calc(33.72% + 1.63px) calc(2.72% + 4.73px),
    calc(34.55% + 1.55px) calc(2.45% + 4.76px),
    calc(35.38% + 1.46px) calc(2.18% + 4.78px),
    calc(36.22% + 1.38px) calc(1.94% + 4.81px),
    calc(37.06% + 1.29px) calc(1.7% + 4.83px),
    calc(37.9% + 1.21px) calc(1.49% + 4.85px),
    calc(38.75% + 1.12px) calc(1.28% + 4.87px),
    calc(39.6% + 1.04px) calc(1.09% + 4.89px),
    calc(40.46% + 0.95px) calc(0.92% + 4.91px),
    calc(41.32% + 0.87px) calc(0.76% + 4.92px),
    calc(42.18% + 0.78px) calc(0.62% + 4.94px),
    calc(43.04% + 0.7px) calc(0.49% + 4.95px),
    calc(43.91% + 0.61px) calc(0.37% + 4.96px),
    calc(44.77% + 0.52px) calc(0.27% + 4.97px),
    calc(45.64% + 0.44px) calc(0.19% + 4.98px),
    calc(46.51% + 0.35px) calc(0.12% + 4.99px),
    calc(47.38% + 0.26px) calc(0.07% + 4.99px),
    calc(48.26% + 0.17px) calc(0.03% + 5px),
    calc(49.13% + 0.09px) calc(0.01% + 5px),
    calc(50% + 0px) calc(0% + 5px),
    calc(50.87% + -0.09px) calc(0.01% + 5px),
    calc(51.74% + -0.17px) calc(0.03% + 5px),
    calc(52.62% + -0.26px) calc(0.07% + 4.99px),
    calc(53.49% + -0.35px) calc(0.12% + 4.99px),
    calc(54.36% + -0.44px) calc(0.19% + 4.98px),
    calc(55.23% + -0.52px) calc(0.27% + 4.97px),
    calc(56.09% + -0.61px) calc(0.37% + 4.96px),
    calc(56.96% + -0.7px) calc(0.49% + 4.95px),
    calc(57.82% + -0.78px) calc(0.62% + 4.94px),
    calc(58.68% + -0.87px) calc(0.76% + 4.92px),
    calc(59.54% + -0.95px) calc(0.92% + 4.91px),
    calc(60.4% + -1.04px) calc(1.09% + 4.89px),
    calc(61.25% + -1.12px) calc(1.28% + 4.87px),
    calc(62.1% + -1.21px) calc(1.49% + 4.85px),
    calc(62.94% + -1.29px) calc(1.7% + 4.83px),
    calc(63.78% + -1.38px) calc(1.94% + 4.81px),
    calc(64.62% + -1.46px) calc(2.18% + 4.78px),
    calc(65.45% + -1.55px) calc(2.45% + 4.76px),
    calc(66.28% + -1.63px) calc(2.72% + 4.73px),
    calc(67.1% + -1.71px) calc(3.02% + 4.7px),
    calc(67.92% + -1.79px) calc(3.32% + 4.67px),
    calc(68.73% + -1.87px) calc(3.64% + 4.64px),
    calc(69.54% + -1.95px) calc(3.97% + 4.6px),
    calc(70.34% + -2.03px) calc(4.32% + 4.57px),
    calc(71.13% + -2.11px) calc(4.68% + 4.53px),
    calc(71.92% + -2.19px) calc(5.06% + 4.49px),
    calc(72.7% + -2.27px) calc(5.45% + 4.46px),
    calc(73.47% + -2.35px) calc(5.85% + 4.41px),
    calc(74.24% + -2.42px) calc(6.27% + 4.37px),
    calc(75% + -2.5px) calc(6.7% + 4.33px),
    calc(75.75% + -2.58px) calc(7.14% + 4.29px),
    calc(76.5% + -2.65px) calc(7.6% + 4.24px),
    calc(77.23% + -2.72px) calc(8.07% + 4.19px),
    calc(77.96% + -2.8px) calc(8.55% + 4.15px),
    calc(78.68% + -2.87px) calc(9.04% + 4.1px),
    calc(79.39% + -2.94px) calc(9.55% + 4.05px),
    calc(80.09% + -3.01px) calc(10.07% + 3.99px),
    calc(80.78% + -3.08px) calc(10.6% + 3.94px),
    calc(81.47% + -3.15px) calc(11.14% + 3.89px),
    calc(82.14% + -3.21px) calc(11.7% + 3.83px),
    calc(82.8% + -3.28px) calc(12.26% + 3.77px),
    calc(83.46% + -3.35px) calc(12.84% + 3.72px),
    calc(84.1% + -3.41px) calc(13.43% + 3.66px),
    calc(84.73% + -3.47px) calc(14.03% + 3.6px),
    calc(85.36% + -3.54px) calc(14.64% + 3.54px),
    calc(85.97% + -3.6px) calc(15.27% + 3.47px),
    calc(86.57% + -3.66px) calc(15.9% + 3.41px),
    calc(87.16% + -3.72px) calc(16.54% + 3.35px),
    calc(87.74% + -3.77px) calc(17.2% + 3.28px),
    calc(88.3% + -3.83px) calc(17.86% + 3.21px),
    calc(88.86% + -3.89px) calc(18.53% + 3.15px),
    calc(89.4% + -3.94px) calc(19.22% + 3.08px),
    calc(89.93% + -3.99px) calc(19.91% + 3.01px),
    calc(90.45% + -4.05px) calc(20.61% + 2.94px),
    calc(90.96% + -4.1px) calc(21.32% + 2.87px),
    calc(91.45% + -4.15px) calc(22.04% + 2.8px),
    calc(91.93% + -4.19px) calc(22.77% + 2.72px),
    calc(92.4% + -4.24px) calc(23.5% + 2.65px),
    calc(92.86% + -4.29px) calc(24.25% + 2.58px),
    calc(93.3% + -4.33px) calc(25% + 2.5px),
    calc(93.73% + -4.37px) calc(25.76% + 2.42px),
    calc(94.15% + -4.41px) calc(26.53% + 2.35px),
    calc(94.55% + -4.46px) calc(27.3% + 2.27px),
    calc(94.94% + -4.49px) calc(28.08% + 2.19px),
    calc(95.32% + -4.53px) calc(28.87% + 2.11px),
    calc(95.68% + -4.57px) calc(29.66% + 2.03px),
    calc(96.03% + -4.6px) calc(30.46% + 1.95px),
    calc(96.36% + -4.64px) calc(31.27% + 1.87px),
    calc(96.68% + -4.67px) calc(32.08% + 1.79px),
    calc(96.98% + -4.7px) calc(32.9% + 1.71px),
    calc(97.28% + -4.73px) calc(33.72% + 1.63px),
    calc(97.55% + -4.76px) calc(34.55% + 1.55px),
    calc(97.82% + -4.78px) calc(35.38% + 1.46px),
    calc(98.06% + -4.81px) calc(36.22% + 1.38px),
    calc(98.3% + -4.83px) calc(37.06% + 1.29px),
    calc(98.51% + -4.85px) calc(37.9% + 1.21px),
    calc(98.72% + -4.87px) calc(38.75% + 1.12px),
    calc(98.91% + -4.89px) calc(39.6% + 1.04px),
    calc(99.08% + -4.91px) calc(40.46% + 0.95px),
    calc(99.24% + -4.92px) calc(41.32% + 0.87px),
    calc(99.38% + -4.94px) calc(42.18% + 0.78px),
    calc(99.51% + -4.95px) calc(43.04% + 0.7px),
    calc(99.63% + -4.96px) calc(43.91% + 0.61px),
    calc(99.73% + -4.97px) calc(44.77% + 0.52px),
    calc(99.81% + -4.98px) calc(45.64% + 0.44px),
    calc(99.88% + -4.99px) calc(46.51% + 0.35px),
    calc(99.93% + -4.99px) calc(47.38% + 0.26px),
    calc(99.97% + -5px) calc(48.26% + 0.17px),
    calc(99.99% + -5px) calc(49.13% + 0.09px),
    calc(100% + -5px) calc(50% + 0px),
    calc(99.99% + -5px) calc(50.87% + -0.09px),
    calc(99.97% + -5px) calc(51.74% + -0.17px),
    calc(99.93% + -4.99px) calc(52.62% + -0.26px),
    calc(99.88% + -4.99px) calc(53.49% + -0.35px),
    calc(99.81% + -4.98px) calc(54.36% + -0.44px),
    calc(99.73% + -4.97px) calc(55.23% + -0.52px),
    calc(99.63% + -4.96px) calc(56.09% + -0.61px),
    calc(99.51% + -4.95px) calc(56.96% + -0.7px),
    calc(99.38% + -4.94px) calc(57.82% + -0.78px),
    calc(99.24% + -4.92px) calc(58.68% + -0.87px),
    calc(99.08% + -4.91px) calc(59.54% + -0.95px),
    calc(98.91% + -4.89px) calc(60.4% + -1.04px),
    calc(98.72% + -4.87px) calc(61.25% + -1.12px),
    calc(98.51% + -4.85px) calc(62.1% + -1.21px),
    calc(98.3% + -4.83px) calc(62.94% + -1.29px),
    calc(98.06% + -4.81px) calc(63.78% + -1.38px),
    calc(97.82% + -4.78px) calc(64.62% + -1.46px),
    calc(97.55% + -4.76px) calc(65.45% + -1.55px),
    calc(97.28% + -4.73px) calc(66.28% + -1.63px),
    calc(96.98% + -4.7px) calc(67.1% + -1.71px),
    calc(96.68% + -4.67px) calc(67.92% + -1.79px),
    calc(96.36% + -4.64px) calc(68.73% + -1.87px),
    calc(96.03% + -4.6px) calc(69.54% + -1.95px),
    calc(95.68% + -4.57px) calc(70.34% + -2.03px),
    calc(95.32% + -4.53px) calc(71.13% + -2.11px),
    calc(94.94% + -4.49px) calc(71.92% + -2.19px),
    calc(94.55% + -4.46px) calc(72.7% + -2.27px),
    calc(94.15% + -4.41px) calc(73.47% + -2.35px),
    calc(93.73% + -4.37px) calc(74.24% + -2.42px),
    calc(93.3% + -4.33px) calc(75% + -2.5px),
    calc(92.86% + -4.29px) calc(75.75% + -2.58px),
    calc(92.4% + -4.24px) calc(76.5% + -2.65px),
    calc(91.93% + -4.19px) calc(77.23% + -2.72px),
    calc(91.45% + -4.15px) calc(77.96% + -2.8px),
    calc(90.96% + -4.1px) calc(78.68% + -2.87px),
    calc(90.45% + -4.05px) calc(79.39% + -2.94px),
    calc(89.93% + -3.99px) calc(80.09% + -3.01px),
    calc(89.4% + -3.94px) calc(80.78% + -3.08px),
    calc(88.86% + -3.89px) calc(81.47% + -3.15px),
    calc(88.3% + -3.83px) calc(82.14% + -3.21px),
    calc(87.74% + -3.77px) calc(82.8% + -3.28px),
    calc(87.16% + -3.72px) calc(83.46% + -3.35px),
    calc(86.57% + -3.66px) calc(84.1% + -3.41px),
    calc(85.97% + -3.6px) calc(84.73% + -3.47px),
    calc(85.36% + -3.54px) calc(85.36% + -3.54px),
    calc(84.73% + -3.47px) calc(85.97% + -3.6px),
    calc(84.1% + -3.41px) calc(86.57% + -3.66px),
    calc(83.46% + -3.35px) calc(87.16% + -3.72px),
    calc(82.8% + -3.28px) calc(87.74% + -3.77px),
    calc(82.14% + -3.21px) calc(88.3% + -3.83px),
    calc(81.47% + -3.15px) calc(88.86% + -3.89px),
    calc(80.78% + -3.08px) calc(89.4% + -3.94px),
    calc(80.09% + -3.01px) calc(89.93% + -3.99px),
    calc(79.39% + -2.94px) calc(90.45% + -4.05px),
    calc(78.68% + -2.87px) calc(90.96% + -4.1px),
    calc(77.96% + -2.8px) calc(91.45% + -4.15px),
    calc(77.23% + -2.72px) calc(91.93% + -4.19px),
    calc(76.5% + -2.65px) calc(92.4% + -4.24px),
    calc(75.75% + -2.58px) calc(92.86% + -4.29px),
    calc(75% + -2.5px) calc(93.3% + -4.33px),
    calc(74.24% + -2.42px) calc(93.73% + -4.37px),
    calc(73.47% + -2.35px) calc(94.15% + -4.41px),
    calc(72.7% + -2.27px) calc(94.55% + -4.46px),
    calc(71.92% + -2.19px) calc(94.94% + -4.49px),
    calc(71.13% + -2.11px) calc(95.32% + -4.53px),
    calc(70.34% + -2.03px) calc(95.68% + -4.57px),
    calc(69.54% + -1.95px) calc(96.03% + -4.6px),
    calc(68.73% + -1.87px) calc(96.36% + -4.64px),
    calc(67.92% + -1.79px) calc(96.68% + -4.67px),
    calc(67.1% + -1.71px) calc(96.98% + -4.7px),
    calc(66.28% + -1.63px) calc(97.28% + -4.73px),
    calc(65.45% + -1.55px) calc(97.55% + -4.76px),
    calc(64.62% + -1.46px) calc(97.82% + -4.78px),
    calc(63.78% + -1.38px) calc(98.06% + -4.81px),
    calc(62.94% + -1.29px) calc(98.3% + -4.83px),
    calc(62.1% + -1.21px) calc(98.51% + -4.85px),
    calc(61.25% + -1.12px) calc(98.72% + -4.87px),
    calc(60.4% + -1.04px) calc(98.91% + -4.89px),
    calc(59.54% + -0.95px) calc(99.08% + -4.91px),
    calc(58.68% + -0.87px) calc(99.24% + -4.92px),
    calc(57.82% + -0.78px) calc(99.38% + -4.94px),
    calc(56.96% + -0.7px) calc(99.51% + -4.95px),
    calc(56.09% + -0.61px) calc(99.63% + -4.96px),
    calc(55.23% + -0.52px) calc(99.73% + -4.97px),
    calc(54.36% + -0.44px) calc(99.81% + -4.98px),
    calc(53.49% + -0.35px) calc(99.88% + -4.99px),
    calc(52.62% + -0.26px) calc(99.93% + -4.99px),
    calc(51.74% + -0.17px) calc(99.97% + -5px),
    calc(50.87% + -0.09px) calc(99.99% + -5px),
    calc(50% + -0px) calc(100% + -5px),
    calc(49.13% + 0.09px) calc(99.99% + -5px),
    calc(48.26% + 0.17px) calc(99.97% + -5px),
    calc(47.38% + 0.26px) calc(99.93% + -4.99px),
    calc(46.51% + 0.35px) calc(99.88% + -4.99px),
    calc(45.64% + 0.44px) calc(99.81% + -4.98px),
    calc(44.77% + 0.52px) calc(99.73% + -4.97px),
    calc(43.91% + 0.61px) calc(99.63% + -4.96px),
    calc(43.04% + 0.7px) calc(99.51% + -4.95px),
    calc(42.18% + 0.78px) calc(99.38% + -4.94px),
    calc(41.32% + 0.87px) calc(99.24% + -4.92px),
    calc(40.46% + 0.95px) calc(99.08% + -4.91px),
    calc(39.6% + 1.04px) calc(98.91% + -4.89px),
    calc(38.75% + 1.12px) calc(98.72% + -4.87px),
    calc(37.9% + 1.21px) calc(98.51% + -4.85px),
    calc(37.06% + 1.29px) calc(98.3% + -4.83px),
    calc(36.22% + 1.38px) calc(98.06% + -4.81px),
    calc(35.38% + 1.46px) calc(97.82% + -4.78px),
    calc(34.55% + 1.55px) calc(97.55% + -4.76px),
    calc(33.72% + 1.63px) calc(97.28% + -4.73px),
    calc(32.9% + 1.71px) calc(96.98% + -4.7px),
    calc(32.08% + 1.79px) calc(96.68% + -4.67px),
    calc(31.27% + 1.87px) calc(96.36% + -4.64px),
    calc(30.46% + 1.95px) calc(96.03% + -4.6px),
    calc(29.66% + 2.03px) calc(95.68% + -4.57px),
    calc(28.87% + 2.11px) calc(95.32% + -4.53px),
    calc(28.08% + 2.19px) calc(94.94% + -4.49px),
    calc(27.3% + 2.27px) calc(94.55% + -4.46px),
    calc(26.53% + 2.35px) calc(94.15% + -4.41px),
    calc(25.76% + 2.42px) calc(93.73% + -4.37px),
    calc(25% + 2.5px) calc(93.3% + -4.33px),
    calc(24.25% + 2.58px) calc(92.86% + -4.29px),
    calc(23.5% + 2.65px) calc(92.4% + -4.24px),
    calc(22.77% + 2.72px) calc(91.93% + -4.19px),
    calc(22.04% + 2.8px) calc(91.45% + -4.15px),
    calc(21.32% + 2.87px) calc(90.96% + -4.1px),
    calc(20.61% + 2.94px) calc(90.45% + -4.05px),
    calc(19.91% + 3.01px) calc(89.93% + -3.99px),
    calc(19.22% + 3.08px) calc(89.4% + -3.94px),
    calc(18.53% + 3.15px) calc(88.86% + -3.89px),
    calc(17.86% + 3.21px) calc(88.3% + -3.83px),
    calc(17.2% + 3.28px) calc(87.74% + -3.77px),
    calc(16.54% + 3.35px) calc(87.16% + -3.72px),
    calc(15.9% + 3.41px) calc(86.57% + -3.66px),
    calc(15.27% + 3.47px) calc(85.97% + -3.6px),
    calc(14.64% + 3.54px) calc(85.36% + -3.54px),
    calc(14.03% + 3.6px) calc(84.73% + -3.47px),
    calc(13.43% + 3.66px) calc(84.1% + -3.41px),
    calc(12.84% + 3.72px) calc(83.46% + -3.35px),
    calc(12.26% + 3.77px) calc(82.8% + -3.28px),
    calc(11.7% + 3.83px) calc(82.14% + -3.21px),
    calc(11.14% + 3.89px) calc(81.47% + -3.15px),
    calc(10.6% + 3.94px) calc(80.78% + -3.08px),
    calc(10.07% + 3.99px) calc(80.09% + -3.01px),
    calc(9.55% + 4.05px) calc(79.39% + -2.94px),
    calc(9.04% + 4.1px) calc(78.68% + -2.87px),
    calc(8.55% + 4.15px) calc(77.96% + -2.8px),
    calc(8.07% + 4.19px) calc(77.23% + -2.72px),
    calc(7.6% + 4.24px) calc(76.5% + -2.65px),
    calc(7.14% + 4.29px) calc(75.75% + -2.58px),
    calc(6.7% + 4.33px) calc(75% + -2.5px),
    calc(6.27% + 4.37px) calc(74.24% + -2.42px),
    calc(5.85% + 4.41px) calc(73.47% + -2.35px),
    calc(5.45% + 4.46px) calc(72.7% + -2.27px),
    calc(5.06% + 4.49px) calc(71.92% + -2.19px),
    calc(4.68% + 4.53px) calc(71.13% + -2.11px),
    calc(4.32% + 4.57px) calc(70.34% + -2.03px),
    calc(3.97% + 4.6px) calc(69.54% + -1.95px),
    calc(3.64% + 4.64px) calc(68.73% + -1.87px),
    calc(3.32% + 4.67px) calc(67.92% + -1.79px),
    calc(3.02% + 4.7px) calc(67.1% + -1.71px),
    calc(2.72% + 4.73px) calc(66.28% + -1.63px),
    calc(2.45% + 4.76px) calc(65.45% + -1.55px),
    calc(2.18% + 4.78px) calc(64.62% + -1.46px),
    calc(1.94% + 4.81px) calc(63.78% + -1.38px),
    calc(1.7% + 4.83px) calc(62.94% + -1.29px),
    calc(1.49% + 4.85px) calc(62.1% + -1.21px),
    calc(1.28% + 4.87px) calc(61.25% + -1.12px),
    calc(1.09% + 4.89px) calc(60.4% + -1.04px),
    calc(0.92% + 4.91px) calc(59.54% + -0.95px),
    calc(0.76% + 4.92px) calc(58.68% + -0.87px),
    calc(0.62% + 4.94px) calc(57.82% + -0.78px),
    calc(0.49% + 4.95px) calc(56.96% + -0.7px),
    calc(0.37% + 4.96px) calc(56.09% + -0.61px),
    calc(0.27% + 4.97px) calc(55.23% + -0.52px),
    calc(0.19% + 4.98px) calc(54.36% + -0.44px),
    calc(0.12% + 4.99px) calc(53.49% + -0.35px),
    calc(0.07% + 4.99px) calc(52.62% + -0.26px),
    calc(0.03% + 5px) calc(51.74% + -0.17px),
    calc(0.01% + 5px) calc(50.87% + -0.09px),
    calc(0% + 5px) calc(50% + -0px),
    calc(0.01% + 5px) calc(49.13% + 0.09px),
    calc(0.03% + 5px) calc(48.26% + 0.17px),
    calc(0.07% + 4.99px) calc(47.38% + 0.26px),
    calc(0.12% + 4.99px) calc(46.51% + 0.35px),
    calc(0.19% + 4.98px) calc(45.64% + 0.44px),
    calc(0.27% + 4.97px) calc(44.77% + 0.52px),
    calc(0.37% + 4.96px) calc(43.91% + 0.61px),
    calc(0.49% + 4.95px) calc(43.04% + 0.7px),
    calc(0.62% + 4.94px) calc(42.18% + 0.78px),
    calc(0.76% + 4.92px) calc(41.32% + 0.87px),
    calc(0.92% + 4.91px) calc(40.46% + 0.95px),
    calc(1.09% + 4.89px) calc(39.6% + 1.04px),
    calc(1.28% + 4.87px) calc(38.75% + 1.12px),
    calc(1.49% + 4.85px) calc(37.9% + 1.21px),
    calc(1.7% + 4.83px) calc(37.06% + 1.29px),
    calc(1.94% + 4.81px) calc(36.22% + 1.38px),
    calc(2.18% + 4.78px) calc(35.38% + 1.46px),
    calc(2.45% + 4.76px) calc(34.55% + 1.55px),
    calc(2.72% + 4.73px) calc(33.72% + 1.63px),
    calc(3.02% + 4.7px) calc(32.9% + 1.71px),
    calc(3.32% + 4.67px) calc(32.08% + 1.79px),
    calc(3.64% + 4.64px) calc(31.27% + 1.87px),
    calc(3.97% + 4.6px) calc(30.46% + 1.95px),
    calc(4.32% + 4.57px) calc(29.66% + 2.03px),
    calc(4.68% + 4.53px) calc(28.87% + 2.11px),
    calc(5.06% + 4.49px) calc(28.08% + 2.19px),
    calc(5.45% + 4.46px) calc(27.3% + 2.27px),
    calc(5.85% + 4.41px) calc(26.53% + 2.35px),
    calc(6.27% + 4.37px) calc(25.76% + 2.42px),
    calc(6.7% + 4.33px) calc(25% + 2.5px),
    calc(7.14% + 4.29px) calc(24.25% + 2.58px),
    calc(7.6% + 4.24px) calc(23.5% + 2.65px),
    calc(8.07% + 4.19px) calc(22.77% + 2.72px),
    calc(8.55% + 4.15px) calc(22.04% + 2.8px),
    calc(9.04% + 4.1px) calc(21.32% + 2.87px),
    calc(9.55% + 4.05px) calc(20.61% + 2.94px),
    calc(10.07% + 3.99px) calc(19.91% + 3.01px),
    calc(10.6% + 3.94px) calc(19.22% + 3.08px),
    calc(11.14% + 3.89px) calc(18.53% + 3.15px),
    calc(11.7% + 3.83px) calc(17.86% + 3.21px),
    calc(12.26% + 3.77px) calc(17.2% + 3.28px),
    calc(12.84% + 3.72px) calc(16.54% + 3.35px),
    calc(13.43% + 3.66px) calc(15.9% + 3.41px),
    calc(14.03% + 3.6px) calc(15.27% + 3.47px)
  );
}

.map-border {
  transition: clip-path 600ms;
  height: 100%;
  width: 100%;
  background-color: darkgray;
  clip-path: polygon(
    calc(14.64% + 0px) calc(14.64% + 0px),
    calc(15.27% + 0px) calc(14.03% + 0px),
    calc(15.9% + 0px) calc(13.43% + 0px),
    calc(16.54% + 0px) calc(12.84% + 0px),
    calc(17.2% + 0px) calc(12.26% + 0px),
    calc(17.86% + 0px) calc(11.7% + 0px),
    calc(18.53% + 0px) calc(11.14% + 0px),
    calc(19.22% + 0px) calc(10.6% + 0px),
    calc(19.91% + 0px) calc(10.07% + 0px),
    calc(20.61% + 0px) calc(9.55% + 0px),
    calc(21.32% + 0px) calc(9.04% + 0px),
    calc(22.04% + 0px) calc(8.55% + 0px),
    calc(22.77% + 0px) calc(8.07% + 0px),
    calc(23.5% + 0px) calc(7.6% + 0px),
    calc(24.25% + 0px) calc(7.14% + 0px),
    calc(25% + 0px) calc(6.7% + 0px),
    calc(25.76% + 0px) calc(6.27% + 0px),
    calc(26.53% + 0px) calc(5.85% + 0px),
    calc(27.3% + 0px) calc(5.45% + 0px),
    calc(28.08% + 0px) calc(5.06% + 0px),
    calc(28.87% + 0px) calc(4.68% + 0px),
    calc(29.66% + 0px) calc(4.32% + 0px),
    calc(30.46% + 0px) calc(3.97% + 0px),
    calc(31.27% + 0px) calc(3.64% + 0px),
    calc(32.08% + 0px) calc(3.32% + 0px),
    calc(32.9% + 0px) calc(3.02% + 0px),
    calc(33.72% + 0px) calc(2.72% + 0px),
    calc(34.55% + 0px) calc(2.45% + 0px),
    calc(35.38% + 0px) calc(2.18% + 0px),
    calc(36.22% + 0px) calc(1.94% + 0px),
    calc(37.06% + 0px) calc(1.7% + 0px),
    calc(37.9% + 0px) calc(1.49% + 0px),
    calc(38.75% + 0px) calc(1.28% + 0px),
    calc(39.6% + 0px) calc(1.09% + 0px),
    calc(40.46% + 0px) calc(0.92% + 0px),
    calc(41.32% + 0px) calc(0.76% + 0px),
    calc(42.18% + 0px) calc(0.62% + 0px),
    calc(43.04% + 0px) calc(0.49% + 0px),
    calc(43.91% + 0px) calc(0.37% + 0px),
    calc(44.77% + 0px) calc(0.27% + 0px),
    calc(45.64% + 0px) calc(0.19% + 0px),
    calc(46.51% + 0px) calc(0.12% + 0px),
    calc(47.38% + 0px) calc(0.07% + 0px),
    calc(48.26% + 0px) calc(0.03% + 0px),
    calc(49.13% + 0px) calc(0.01% + 0px),
    calc(50% + 0px) calc(0% + 0px),
    calc(50.87% + -0px) calc(0.01% + 0px),
    calc(51.74% + -0px) calc(0.03% + 0px),
    calc(52.62% + -0px) calc(0.07% + 0px),
    calc(53.49% + -0px) calc(0.12% + 0px),
    calc(54.36% + -0px) calc(0.19% + 0px),
    calc(55.23% + -0px) calc(0.27% + 0px),
    calc(56.09% + -0px) calc(0.37% + 0px),
    calc(56.96% + -0px) calc(0.49% + 0px),
    calc(57.82% + -0px) calc(0.62% + 0px),
    calc(58.68% + -0px) calc(0.76% + 0px),
    calc(59.54% + -0px) calc(0.92% + 0px),
    calc(60.4% + -0px) calc(1.09% + 0px),
    calc(61.25% + -0px) calc(1.28% + 0px),
    calc(62.1% + -0px) calc(1.49% + 0px),
    calc(62.94% + -0px) calc(1.7% + 0px),
    calc(63.78% + -0px) calc(1.94% + 0px),
    calc(64.62% + -0px) calc(2.18% + 0px),
    calc(65.45% + -0px) calc(2.45% + 0px),
    calc(66.28% + -0px) calc(2.72% + 0px),
    calc(67.1% + -0px) calc(3.02% + 0px),
    calc(67.92% + -0px) calc(3.32% + 0px),
    calc(68.73% + -0px) calc(3.64% + 0px),
    calc(69.54% + -0px) calc(3.97% + 0px),
    calc(70.34% + -0px) calc(4.32% + 0px),
    calc(71.13% + -0px) calc(4.68% + 0px),
    calc(71.92% + -0px) calc(5.06% + 0px),
    calc(72.7% + -0px) calc(5.45% + 0px),
    calc(73.47% + -0px) calc(5.85% + 0px),
    calc(74.24% + -0px) calc(6.27% + 0px),
    calc(75% + -0px) calc(6.7% + 0px),
    calc(75.75% + -0px) calc(7.14% + 0px),
    calc(76.5% + -0px) calc(7.6% + 0px),
    calc(77.23% + -0px) calc(8.07% + 0px),
    calc(77.96% + -0px) calc(8.55% + 0px),
    calc(78.68% + -0px) calc(9.04% + 0px),
    calc(79.39% + -0px) calc(9.55% + 0px),
    calc(80.09% + -0px) calc(10.07% + 0px),
    calc(80.78% + -0px) calc(10.6% + 0px),
    calc(81.47% + -0px) calc(11.14% + 0px),
    calc(82.14% + -0px) calc(11.7% + 0px),
    calc(82.8% + -0px) calc(12.26% + 0px),
    calc(83.46% + -0px) calc(12.84% + 0px),
    calc(84.1% + -0px) calc(13.43% + 0px),
    calc(84.73% + -0px) calc(14.03% + 0px),
    calc(85.36% + -0px) calc(14.64% + 0px),
    calc(85.97% + -0px) calc(15.27% + 0px),
    calc(86.57% + -0px) calc(15.9% + 0px),
    calc(87.16% + -0px) calc(16.54% + 0px),
    calc(87.74% + -0px) calc(17.2% + 0px),
    calc(88.3% + -0px) calc(17.86% + 0px),
    calc(88.86% + -0px) calc(18.53% + 0px),
    calc(89.4% + -0px) calc(19.22% + 0px),
    calc(89.93% + -0px) calc(19.91% + 0px),
    calc(90.45% + -0px) calc(20.61% + 0px),
    calc(90.96% + -0px) calc(21.32% + 0px),
    calc(91.45% + -0px) calc(22.04% + 0px),
    calc(91.93% + -0px) calc(22.77% + 0px),
    calc(92.4% + -0px) calc(23.5% + 0px),
    calc(92.86% + -0px) calc(24.25% + 0px),
    calc(93.3% + -0px) calc(25% + 0px),
    calc(93.73% + -0px) calc(25.76% + 0px),
    calc(94.15% + -0px) calc(26.53% + 0px),
    calc(94.55% + -0px) calc(27.3% + 0px),
    calc(94.94% + -0px) calc(28.08% + 0px),
    calc(95.32% + -0px) calc(28.87% + 0px),
    calc(95.68% + -0px) calc(29.66% + 0px),
    calc(96.03% + -0px) calc(30.46% + 0px),
    calc(96.36% + -0px) calc(31.27% + 0px),
    calc(96.68% + -0px) calc(32.08% + 0px),
    calc(96.98% + -0px) calc(32.9% + 0px),
    calc(97.28% + -0px) calc(33.72% + 0px),
    calc(97.55% + -0px) calc(34.55% + 0px),
    calc(97.82% + -0px) calc(35.38% + 0px),
    calc(98.06% + -0px) calc(36.22% + 0px),
    calc(98.3% + -0px) calc(37.06% + 0px),
    calc(98.51% + -0px) calc(37.9% + 0px),
    calc(98.72% + -0px) calc(38.75% + 0px),
    calc(98.91% + -0px) calc(39.6% + 0px),
    calc(99.08% + -0px) calc(40.46% + 0px),
    calc(99.24% + -0px) calc(41.32% + 0px),
    calc(99.38% + -0px) calc(42.18% + 0px),
    calc(99.51% + -0px) calc(43.04% + 0px),
    calc(99.63% + -0px) calc(43.91% + 0px),
    calc(99.73% + -0px) calc(44.77% + 0px),
    calc(99.81% + -0px) calc(45.64% + 0px),
    calc(99.88% + -0px) calc(46.51% + 0px),
    calc(99.93% + -0px) calc(47.38% + 0px),
    calc(99.97% + -0px) calc(48.26% + 0px),
    calc(99.99% + -0px) calc(49.13% + 0px),
    calc(100% + -0px) calc(50% + 0px),
    calc(99.99% + -0px) calc(50.87% + -0px),
    calc(99.97% + -0px) calc(51.74% + -0px),
    calc(99.93% + -0px) calc(52.62% + -0px),
    calc(99.88% + -0px) calc(53.49% + -0px),
    calc(99.81% + -0px) calc(54.36% + -0px),
    calc(99.73% + -0px) calc(55.23% + -0px),
    calc(99.63% + -0px) calc(56.09% + -0px),
    calc(99.51% + -0px) calc(56.96% + -0px),
    calc(99.38% + -0px) calc(57.82% + -0px),
    calc(99.24% + -0px) calc(58.68% + -0px),
    calc(99.08% + -0px) calc(59.54% + -0px),
    calc(98.91% + -0px) calc(60.4% + -0px),
    calc(98.72% + -0px) calc(61.25% + -0px),
    calc(98.51% + -0px) calc(62.1% + -0px),
    calc(98.3% + -0px) calc(62.94% + -0px),
    calc(98.06% + -0px) calc(63.78% + -0px),
    calc(97.82% + -0px) calc(64.62% + -0px),
    calc(97.55% + -0px) calc(65.45% + -0px),
    calc(97.28% + -0px) calc(66.28% + -0px),
    calc(96.98% + -0px) calc(67.1% + -0px),
    calc(96.68% + -0px) calc(67.92% + -0px),
    calc(96.36% + -0px) calc(68.73% + -0px),
    calc(96.03% + -0px) calc(69.54% + -0px),
    calc(95.68% + -0px) calc(70.34% + -0px),
    calc(95.32% + -0px) calc(71.13% + -0px),
    calc(94.94% + -0px) calc(71.92% + -0px),
    calc(94.55% + -0px) calc(72.7% + -0px),
    calc(94.15% + -0px) calc(73.47% + -0px),
    calc(93.73% + -0px) calc(74.24% + -0px),
    calc(93.3% + -0px) calc(75% + -0px),
    calc(92.86% + -0px) calc(75.75% + -0px),
    calc(92.4% + -0px) calc(76.5% + -0px),
    calc(91.93% + -0px) calc(77.23% + -0px),
    calc(91.45% + -0px) calc(77.96% + -0px),
    calc(90.96% + -0px) calc(78.68% + -0px),
    calc(90.45% + -0px) calc(79.39% + -0px),
    calc(89.93% + -0px) calc(80.09% + -0px),
    calc(89.4% + -0px) calc(80.78% + -0px),
    calc(88.86% + -0px) calc(81.47% + -0px),
    calc(88.3% + -0px) calc(82.14% + -0px),
    calc(87.74% + -0px) calc(82.8% + -0px),
    calc(87.16% + -0px) calc(83.46% + -0px),
    calc(86.57% + -0px) calc(84.1% + -0px),
    calc(85.97% + -0px) calc(84.73% + -0px),
    calc(85.36% + -0px) calc(85.36% + -0px),
    calc(84.73% + -0px) calc(85.97% + -0px),
    calc(84.1% + -0px) calc(86.57% + -0px),
    calc(83.46% + -0px) calc(87.16% + -0px),
    calc(82.8% + -0px) calc(87.74% + -0px),
    calc(82.14% + -0px) calc(88.3% + -0px),
    calc(81.47% + -0px) calc(88.86% + -0px),
    calc(80.78% + -0px) calc(89.4% + -0px),
    calc(80.09% + -0px) calc(89.93% + -0px),
    calc(79.39% + -0px) calc(90.45% + -0px),
    calc(78.68% + -0px) calc(90.96% + -0px),
    calc(77.96% + -0px) calc(91.45% + -0px),
    calc(77.23% + -0px) calc(91.93% + -0px),
    calc(76.5% + -0px) calc(92.4% + -0px),
    calc(75.75% + -0px) calc(92.86% + -0px),
    calc(75% + -0px) calc(93.3% + -0px),
    calc(74.24% + -0px) calc(93.73% + -0px),
    calc(73.47% + -0px) calc(94.15% + -0px),
    calc(72.7% + -0px) calc(94.55% + -0px),
    calc(71.92% + -0px) calc(94.94% + -0px),
    calc(71.13% + -0px) calc(95.32% + -0px),
    calc(70.34% + -0px) calc(95.68% + -0px),
    calc(69.54% + -0px) calc(96.03% + -0px),
    calc(68.73% + -0px) calc(96.36% + -0px),
    calc(67.92% + -0px) calc(96.68% + -0px),
    calc(67.1% + -0px) calc(96.98% + -0px),
    calc(66.28% + -0px) calc(97.28% + -0px),
    calc(65.45% + -0px) calc(97.55% + -0px),
    calc(64.62% + -0px) calc(97.82% + -0px),
    calc(63.78% + -0px) calc(98.06% + -0px),
    calc(62.94% + -0px) calc(98.3% + -0px),
    calc(62.1% + -0px) calc(98.51% + -0px),
    calc(61.25% + -0px) calc(98.72% + -0px),
    calc(60.4% + -0px) calc(98.91% + -0px),
    calc(59.54% + -0px) calc(99.08% + -0px),
    calc(58.68% + -0px) calc(99.24% + -0px),
    calc(57.82% + -0px) calc(99.38% + -0px),
    calc(56.96% + -0px) calc(99.51% + -0px),
    calc(56.09% + -0px) calc(99.63% + -0px),
    calc(55.23% + -0px) calc(99.73% + -0px),
    calc(54.36% + -0px) calc(99.81% + -0px),
    calc(53.49% + -0px) calc(99.88% + -0px),
    calc(52.62% + -0px) calc(99.93% + -0px),
    calc(51.74% + -0px) calc(99.97% + -0px),
    calc(50.87% + -0px) calc(99.99% + -0px),
    calc(50% + -0px) calc(100% + -0px),
    calc(49.13% + 0px) calc(99.99% + -0px),
    calc(48.26% + 0px) calc(99.97% + -0px),
    calc(47.38% + 0px) calc(99.93% + -0px),
    calc(46.51% + 0px) calc(99.88% + -0px),
    calc(45.64% + 0px) calc(99.81% + -0px),
    calc(44.77% + 0px) calc(99.73% + -0px),
    calc(43.91% + 0px) calc(99.63% + -0px),
    calc(43.04% + 0px) calc(99.51% + -0px),
    calc(42.18% + 0px) calc(99.38% + -0px),
    calc(41.32% + 0px) calc(99.24% + -0px),
    calc(40.46% + 0px) calc(99.08% + -0px),
    calc(39.6% + 0px) calc(98.91% + -0px),
    calc(38.75% + 0px) calc(98.72% + -0px),
    calc(37.9% + 0px) calc(98.51% + -0px),
    calc(37.06% + 0px) calc(98.3% + -0px),
    calc(36.22% + 0px) calc(98.06% + -0px),
    calc(35.38% + 0px) calc(97.82% + -0px),
    calc(34.55% + 0px) calc(97.55% + -0px),
    calc(33.72% + 0px) calc(97.28% + -0px),
    calc(32.9% + 0px) calc(96.98% + -0px),
    calc(32.08% + 0px) calc(96.68% + -0px),
    calc(31.27% + 0px) calc(96.36% + -0px),
    calc(30.46% + 0px) calc(96.03% + -0px),
    calc(29.66% + 0px) calc(95.68% + -0px),
    calc(28.87% + 0px) calc(95.32% + -0px),
    calc(28.08% + 0px) calc(94.94% + -0px),
    calc(27.3% + 0px) calc(94.55% + -0px),
    calc(26.53% + 0px) calc(94.15% + -0px),
    calc(25.76% + 0px) calc(93.73% + -0px),
    calc(25% + 0px) calc(93.3% + -0px),
    calc(24.25% + 0px) calc(92.86% + -0px),
    calc(23.5% + 0px) calc(92.4% + -0px),
    calc(22.77% + 0px) calc(91.93% + -0px),
    calc(22.04% + 0px) calc(91.45% + -0px),
    calc(21.32% + 0px) calc(90.96% + -0px),
    calc(20.61% + 0px) calc(90.45% + -0px),
    calc(19.91% + 0px) calc(89.93% + -0px),
    calc(19.22% + 0px) calc(89.4% + -0px),
    calc(18.53% + 0px) calc(88.86% + -0px),
    calc(17.86% + 0px) calc(88.3% + -0px),
    calc(17.2% + 0px) calc(87.74% + -0px),
    calc(16.54% + 0px) calc(87.16% + -0px),
    calc(15.9% + 0px) calc(86.57% + -0px),
    calc(15.27% + 0px) calc(85.97% + -0px),
    calc(14.64% + 0px) calc(85.36% + -0px),
    calc(14.03% + 0px) calc(84.73% + -0px),
    calc(13.43% + 0px) calc(84.1% + -0px),
    calc(12.84% + 0px) calc(83.46% + -0px),
    calc(12.26% + 0px) calc(82.8% + -0px),
    calc(11.7% + 0px) calc(82.14% + -0px),
    calc(11.14% + 0px) calc(81.47% + -0px),
    calc(10.6% + 0px) calc(80.78% + -0px),
    calc(10.07% + 0px) calc(80.09% + -0px),
    calc(9.55% + 0px) calc(79.39% + -0px),
    calc(9.04% + 0px) calc(78.68% + -0px),
    calc(8.55% + 0px) calc(77.96% + -0px),
    calc(8.07% + 0px) calc(77.23% + -0px),
    calc(7.6% + 0px) calc(76.5% + -0px),
    calc(7.14% + 0px) calc(75.75% + -0px),
    calc(6.7% + 0px) calc(75% + -0px),
    calc(6.27% + 0px) calc(74.24% + -0px),
    calc(5.85% + 0px) calc(73.47% + -0px),
    calc(5.45% + 0px) calc(72.7% + -0px),
    calc(5.06% + 0px) calc(71.92% + -0px),
    calc(4.68% + 0px) calc(71.13% + -0px),
    calc(4.32% + 0px) calc(70.34% + -0px),
    calc(3.97% + 0px) calc(69.54% + -0px),
    calc(3.64% + 0px) calc(68.73% + -0px),
    calc(3.32% + 0px) calc(67.92% + -0px),
    calc(3.02% + 0px) calc(67.1% + -0px),
    calc(2.72% + 0px) calc(66.28% + -0px),
    calc(2.45% + 0px) calc(65.45% + -0px),
    calc(2.18% + 0px) calc(64.62% + -0px),
    calc(1.94% + 0px) calc(63.78% + -0px),
    calc(1.7% + 0px) calc(62.94% + -0px),
    calc(1.49% + 0px) calc(62.1% + -0px),
    calc(1.28% + 0px) calc(61.25% + -0px),
    calc(1.09% + 0px) calc(60.4% + -0px),
    calc(0.92% + 0px) calc(59.54% + -0px),
    calc(0.76% + 0px) calc(58.68% + -0px),
    calc(0.62% + 0px) calc(57.82% + -0px),
    calc(0.49% + 0px) calc(56.96% + -0px),
    calc(0.37% + 0px) calc(56.09% + -0px),
    calc(0.27% + 0px) calc(55.23% + -0px),
    calc(0.19% + 0px) calc(54.36% + -0px),
    calc(0.12% + 0px) calc(53.49% + -0px),
    calc(0.07% + 0px) calc(52.62% + -0px),
    calc(0.03% + 0px) calc(51.74% + -0px),
    calc(0.01% + 0px) calc(50.87% + -0px),
    calc(0% + 0px) calc(50% + -0px),
    calc(0.01% + 0px) calc(49.13% + 0px),
    calc(0.03% + 0px) calc(48.26% + 0px),
    calc(0.07% + 0px) calc(47.38% + 0px),
    calc(0.12% + 0px) calc(46.51% + 0px),
    calc(0.19% + 0px) calc(45.64% + 0px),
    calc(0.27% + 0px) calc(44.77% + 0px),
    calc(0.37% + 0px) calc(43.91% + 0px),
    calc(0.49% + 0px) calc(43.04% + 0px),
    calc(0.62% + 0px) calc(42.18% + 0px),
    calc(0.76% + 0px) calc(41.32% + 0px),
    calc(0.92% + 0px) calc(40.46% + 0px),
    calc(1.09% + 0px) calc(39.6% + 0px),
    calc(1.28% + 0px) calc(38.75% + 0px),
    calc(1.49% + 0px) calc(37.9% + 0px),
    calc(1.7% + 0px) calc(37.06% + 0px),
    calc(1.94% + 0px) calc(36.22% + 0px),
    calc(2.18% + 0px) calc(35.38% + 0px),
    calc(2.45% + 0px) calc(34.55% + 0px),
    calc(2.72% + 0px) calc(33.72% + 0px),
    calc(3.02% + 0px) calc(32.9% + 0px),
    calc(3.32% + 0px) calc(32.08% + 0px),
    calc(3.64% + 0px) calc(31.27% + 0px),
    calc(3.97% + 0px) calc(30.46% + 0px),
    calc(4.32% + 0px) calc(29.66% + 0px),
    calc(4.68% + 0px) calc(28.87% + 0px),
    calc(5.06% + 0px) calc(28.08% + 0px),
    calc(5.45% + 0px) calc(27.3% + 0px),
    calc(5.85% + 0px) calc(26.53% + 0px),
    calc(6.27% + 0px) calc(25.76% + 0px),
    calc(6.7% + 0px) calc(25% + 0px),
    calc(7.14% + 0px) calc(24.25% + 0px),
    calc(7.6% + 0px) calc(23.5% + 0px),
    calc(8.07% + 0px) calc(22.77% + 0px),
    calc(8.55% + 0px) calc(22.04% + 0px),
    calc(9.04% + 0px) calc(21.32% + 0px),
    calc(9.55% + 0px) calc(20.61% + 0px),
    calc(10.07% + 0px) calc(19.91% + 0px),
    calc(10.6% + 0px) calc(19.22% + 0px),
    calc(11.14% + 0px) calc(18.53% + 0px),
    calc(11.7% + 0px) calc(17.86% + 0px),
    calc(12.26% + 0px) calc(17.2% + 0px),
    calc(12.84% + 0px) calc(16.54% + 0px),
    calc(13.43% + 0px) calc(15.9% + 0px),
    calc(14.03% + 0px) calc(15.27% + 0px)
  );
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
  }

  .map-expanded {
    top: 0;
    left: 0;
    margin-top: -55px;
    margin-left: 5px;
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
