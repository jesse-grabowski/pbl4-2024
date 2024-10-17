<script setup lang="ts">
import { GoogleMap } from 'vue3-google-map'
import { ref, onMounted, computed } from 'vue'
import { readJsonFromFile } from '@/utils/file-support'
import { getRandomInt } from '@/utils/random-support'
import { type Image } from '@/models/image'

let baseUrl = ''
let images: Image[]

// we need to include the width and height as hints for the browser to reserve enough space
const imageUrl = ref('')
const imageWidth = ref(2560)
const imageHeight = ref(1707)
const imageIsPanorama = ref(true)

const timerText = ref('10:00')
const guessCount = ref(0)
const stageText = computed(() => `${guessCount.value} / 10`)

const mapExpanded = ref(false)

function getRandomImage() {
  const random = getRandomInt(0, images.length)
  imageUrl.value = new URL(images[random].url, baseUrl).href
  guessCount.value++
}

onMounted(async () => {
  baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`
  images = await readJsonFromFile<Image[]>(new URL('src/data/ImageData.json', baseUrl).href)
  getRandomImage()
})
</script>

<template>
  <div class="game">
    <div class="image-container">
      <img v-if="!imageIsPanorama" :src="imageUrl" :width="imageWidth" :height="imageHeight" />
      <v-pannellum v-if="imageIsPanorama" :src="imageUrl"></v-pannellum>
    </div>
    <div class="timer game-control" v-text="timerText"></div>
    <div class="stage game-control" v-text="stageText"></div>
    <button class="guess game-control" @click="getRandomImage">Guess</button>
    <select class="floor game-control">
      <option>1F</option>
      <option>2F</option>
      <option>3F</option>
    </select>
    <div class="map-holder">
      <!-- this needs to be here to make the map a circle, don't ask -->
    </div>
    <div class="map-container">
      <div class="map-border">
        <GoogleMap class="map" api-key="AIzaSyCcQMDjEPrA9cCZAHQfPW1n47H4r5Bx4EI" :zoom="15"></GoogleMap>
      </div>
      <label class="map-expanded">
        <v-icon v-if="mapExpanded" name="fa-compress-arrows-alt" scale="2" />
        <v-icon v-if="!mapExpanded" name="fa-expand-arrows-alt" scale="2" />
        <input type="checkbox" v-model="mapExpanded" />
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
  grid-template-columns: 10rem 1fr auto 1fr 0fr 10rem 10rem;
  grid-template-rows: 4.5rem 1fr 0fr min-content 4.5rem;
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.game:has(.map-expanded input:checked) {
  grid-template-columns: 10rem 1fr auto 0fr 1fr 10rem 10rem;
  grid-template-rows: 4.5rem 0fr 1fr min-content 4.5rem;
}

.image-container {
  grid-row: 1/-1;
  grid-column: 1/-1;
}

.image-container .vue-pannellum {
  z-index: 0;
  height: 100%;
  width: 100%;
}

.image-container img {
  object-fit: cover;
  height: 100%;
  width: 100%;
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
