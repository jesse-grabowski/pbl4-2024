<script setup lang="ts">
import { ref } from 'vue'
import type { Settings } from '@/models/settings'

const masterVolume = ref(45)
const musicVolume = ref(45)
const gameplayVolume = ref(45)
const effectsVolume = ref(45)
const selectedLanguage = ref('English')

const settings = computed<Settings | undefined>(() => {
  return {
    masterVolume : parseInt(masterVolume.value.toString()),
    musicVolume : parseInt(musicVolume.value.toString()),
    gameplayVolume : parseInt(gameplayVolume.value.toString()),
    effectsVolume : parseInt(effectsVolume.value.toString()),
    selectedLanguage : selectedLanguage.value,
  }
})

async function confirm(){
  console.log(settings.value)
}

</script>

<template>
  <div class="settings-page">
    <div class="sliders-container">
      <label for="master-volume" class="slider-label">Master Volume</label>
      <input type="range" id="master-volume" min="0" max="100" v-model="masterVolume" />
      <span class="slider-value">{{ masterVolume }}</span>

      <label for="music" class="slider-label">Music</label>
      <input type="range" id="music" min=0 max=100 v-model="musicVolume" />
      <span class="slider-value">{{ musicVolume }}</span>

      <label for="gameplay" class="slider-label">Gameplay</label>
      <input type="range" id="gameplay" min="0" max="100" v-model="gameplayVolume" />
      <span class="slider-value">{{ gameplayVolume }}</span>

      <label for="background-effects" class="slider-label">Background Effects</label>
      <input type="range" id="background-effects" min="0" max="100" v-model="effectsVolume" />
      <span class="slider-value">{{ effectsVolume }}</span>

      <label for="language" class="slider-label">Language</label>
      <div></div>
      <select v-model="selectedLanguage" class="language-select">
        <option value="English">English</option>
        <option value="Japanese">Japanese</option>
      </select>
      <button @click="confirm">Click Me!</button>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  flex-grow: 1;
  background-image: url('@/assets/images/background_oic.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  display: grid;
  grid-template-columns: 10% 1fr 10%;
  grid-template-rows: 10% 1fr 10%;
}

.settings-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(100, 0, 0, 0.5);
  z-index: 1;
}

.sliders-container {
  grid-column: 2;
  grid-row: 2;
  z-index: 2;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  gap: 1.5rem;
  color: white;
  display: grid;
  grid-template-columns: min-content 1fr min-content;
  align-items: center;
}

.slider-label {
  font-size: 1.3rem;
  min-width: 140px; /* Ensures labels like "Master Volume" don't break */
  text-align: right;
  margin-right: 1rem;
}

input[type='range'] {
  width: 100%;
  margin: 0 1vw;
}

.slider-value {
  font-size: 1.2rem;
  min-width: 40px;
  text-align: right;
}

.language-select {
  font-size: 1.2vw;
  background: #333;
  color: white;
  border: none;
  padding: 0.3rem;
  border-radius: 5px;
}

button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #369f74;
}
</style>
