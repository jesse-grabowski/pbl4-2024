<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { GoogleMap, Marker } from 'vue3-google-map'
import ConfettiExplosion from 'vue-confetti-explosion'
import CorrectGuessSound from '@/assets/sounds/correct-guess.mp3'
import WrongGuessSound from '@/assets/sounds/wrong-guess.mp3'
import type { Ref } from 'vue'
import type { Guess } from '@/models/guess'
import type { Image } from '@/models/image'
import type { MapConfig } from '@/models/mapConfig'

// const mapTypeId = 'satellite'

const props = defineProps<{
  image?: Ref<Image | undefined>
  guess?: Ref<Guess | undefined>
  mapConfig?: Ref<MapConfig | undefined>
}>()

const imageValue = props.image
const guessValue = props.guess
const mapConfigValue = props.mapConfig
console.log(mapConfigValue)

const correctSound = new Audio(CorrectGuessSound)
correctSound.loop = false
const wrongSound = new Audio(WrongGuessSound)
wrongSound.loop = false

function playSound(correct: boolean | undefined) {
  const sound = correct ? correctSound : wrongSound
  sound.play()
}

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'closed'): void
}>()
</script>

<template>
  <VueFinalModal
    class="guess-results-modal"
    content-class="guess-results-modal__content"
    overlay-transition="vfm-fade"
    content-transition="vfm-fade"
    :click-to-close="false"
    :esc-to-close="false"
    v-on:before-open="playSound(guessValue?.correct)"
    v-on:closed="emit('closed')"
  >
    <div class="guess-results-modal__timer guess-results-modal__game-control">{{ guessValue?.time }}</div>
    <div class="guess-results-modal__stage guess-results-modal__game-control">{{ guessValue?.stage }}</div>
    <main class="guess-results-modal__content--main">
      <h1>{{ imageValue?.title }}</h1>
      <GoogleMap
        class="guess-results-modal__content--map"
        :center="mapConfigValue?.center"
        :api-key="mapConfigValue?.apikey"
        :styles="mapConfigValue?.map_styles"
        :zoom-control="mapConfigValue?.zoomcontrol"
        :map-type-control="mapConfigValue?.maptypecontrol"
        :street-view-control="mapConfigValue?.streetviewcontrol"
        :zoom="mapConfigValue?.zoom"
        :mapTypeId="mapConfigValue?.mapTypeId"
        :tilt="mapConfigValue?.tilt"
      >
        <Marker id="marker_guess" :options="{ position: guessValue?.guess }" />
        <Marker id="marker_actual" :options="{ position: imageValue?.coordinate }" />
      </GoogleMap>
      <ConfettiExplosion v-if="guessValue?.correct" />
      <h2>
        Your guess was
        <span :class="guessValue?.correct ? 'guess-results-modal__correct' : 'guess-results-modal__incorrect'">
          {{ guessValue?.correct ? 'CORRECT' : 'INCORRECT' }} </span
        >! Your guess was
        <span :class="guessValue?.correct ? 'guess-results-modal__correct' : 'guess-results-modal__incorrect'"
          >{{ guessValue?.distance }}m</span
        >
        <span v-if="guessValue?.floorDiff != 0">
           and 
           <span class="guess-results-modal__incorrect">{{ guessValue?.floorDiff }} floor(s)</span>
        </span>
        away from the correct location.
      </h2>
      <p>{{ imageValue?.description }}</p>
    </main>
    <button class="guess-results-modal__next" @click="emit('confirm')">NEXT ROUND</button>
  </VueFinalModal>
</template>

<style>
/*
 * vue-final-modal forces us to use global css so namespacing these classes
 */

.guess-results-modal {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;

  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  padding: 5px;
}

.guess-results-modal__content {
  grid-row: 1;
  grid-column: 1;

  display: grid;
  grid-template-columns: 12rem 1fr 12rem;
  grid-template-rows: 4.5rem 1fr 4.5rem 1fr;
  
  overflow-y: scroll;
}

.guess-results-modal__content--main {
  grid-row: 2/-1;
  grid-column: 2;
  display: flex;
  gap: 10px;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: white;
}

.guess-results-modal__content--map {
  height: 40vh;
  aspect-ratio: 16/9;
}

.guess-results-modal__content--main h1 {
  font-size: 3rem;
}

.guess-results-modal__content--main h2 {
  font-size: 2rem;
}

.guess-results-modal__content--main p {
  font-size: 1.5rem;
}

.guess-results-modal__correct {
  color: lime;
}

.guess-results-modal__incorrect {
  color: red;
}

.guess-results-modal__game-control {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 25px;
  padding: 10px 40px;
  margin: 10px;

  font-weight: bold;
  font-size: 1.25rem;
  text-align: center;
}

.guess-results-modal__timer {
  grid-row: 1;
  grid-column: 1;
}

.guess-results-modal__stage {
  grid-row: 1;
  grid-column: 3;
}

.guess-results-modal__next {
  background-color: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  font-weight: bold;
  clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
  padding-right: 15%;
  margin: 10px;
  grid-row: 3;
  grid-column: 3;
}

.guess-results-modal__confetti {
  position: absolute;
}

@media screen and (max-width: 1024px) {
  .guess-results-modal__content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 4.5rem 1fr 4.5rem;
  }

  .guess-results-modal__timer {
    grid-row: 1;
    grid-column: 1;
  }

  .guess-results-modal__stage {
    grid-row: 1;
    grid-column: 2;
  }

  .guess-results-modal__content--main {
    grid-row: 2;
    grid-column: 1/-1;
    
    display: flex;
    gap: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    color: white;
  }

  .guess-results-modal__next {
    background-color: rgba(255, 255, 255, 0.95);
    font-size: 1rem;
    font-weight: bold;
    clip-path: polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%);
    padding-right: 15%;
    margin: 10px;
    grid-row: 3;
    grid-column: 1/-1;
  }
}
</style>
