<script setup lang="ts">
import { GoogleMap , Marker} from "vue3-google-map";
import { ref, onMounted, computed } from 'vue'
import { readImageFromFile } from '@/utils/file-support'
import { Chance } from 'chance'
import { type Image } from '@/models/image'
import { type Guess } from '@/models/guess'
import ImageData from '@/data/ImageData.json'
import DynamicImage from '@/components/DynamicImage.vue'
import { useModal } from 'vue-final-modal'
import GuessResultsModal from '@/components/GuessResultsModal.vue'

const images: Image[] = ImageData
const guessedImageSet = new Set<number>()

// we need to include the width and height as hints for the browser to reserve enough space
const imageUrl = ref('')
const imageWidth = ref(2560)
const imageHeight = ref(1707)
const imageIsPanorama = ref(true)

const image = ref<Image | undefined>(undefined);

const timerText = ref('10:00')
const guessCount = ref(0)
const stageText = computed(() => `${guessCount.value} / 10`)
const apikey = "AIzaSyCcQMDjEPrA9cCZAHQfPW1n47H4r5Bx4EI";
const OIC_COORD = { lat: 34.81027686919236, lng: 135.56099624838777 }
const zoomcontrol = false;
const maptypecontrol = false;
const streetviewcontrol = false;
const map_styles = [
        {
          featureType: "poi",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "administrative",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          stylers: [{ visibility: "off" }],
        },
    ]

let marker_position = OIC_COORD;
let marker_option = ref({ position: marker_position })

// event: google.maps.MapMouseEvent (This is the type of the event, but there will be import error, set the type to any is fine though)
function updateMarkerPosition(event: any) {
      marker_position = {
        lat: event.latLng?.lat() || 0,
        lng: event.latLng?.lng() || 0,
      };
      marker_option.value = {
        ... marker_option.value,
        position: marker_position
      }
      console.log(marker_option);
}

const guess = computed<Guess | undefined>(() => {
  return {
    correct: true,
    distance: 10,
    time: timerText.value,
    stage: stageText.value,
    guess: {
      latitude: 0,
      longitude: 0,
    },
    actual: {
      latitude: 0,
      longitude: 0
    }
  };
});

const mapExpanded = ref(false)

const { open, close } = useModal({
  component: GuessResultsModal,
  attrs: {
    image: image,
    guess: guess,
    onConfirm() {
      close();
    },
    onClosed() {
      getRandomImage();
    }
  },
})

async function doGuess() {
  open();
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
  guessCount.value++
  guessedImageSet.add(randomInt)
}

onMounted(async () => {
  await getRandomImage()
})
</script>

<template>
  <div class="game">
    <DynamicImage class="image-container" :image="image"/>
    <div class="timer game-control" v-text="timerText"></div>
    <div class="stage game-control" v-text="stageText"></div>
    <button class="guess game-control" @click="doGuess">Guess</button>
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
        <GoogleMap
          class="map"
          :center="OIC_COORD"
          :api-key="apikey"
          :styles="map_styles"
          :zoom-control="zoomcontrol"
          :map-type-control="maptypecontrol"
          :street-view-control="streetviewcontrol"
          :zoom="16"
          @click="updateMarkerPosition">
          <Marker id="marker" :options="marker_option" />
        </GoogleMap>
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
