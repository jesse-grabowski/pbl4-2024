<script setup lang="ts">
import { SETTINGS } from '@/data/settings-data'

async function confirm() {
  console.log(
    `MasterVolume: ${SETTINGS.value.masterVolume}`,
    `MusicVolume: ${SETTINGS.value.musicVolume}`,
    `GameplayVolume: ${SETTINGS.value.gameplayVolume}`,
    `EffectsVolume: ${SETTINGS.value.effectsVolume}`,
    `SelectedLanguage: ${SETTINGS.value.selectedLanguage}`,
  )
  alert('Changes saved!')
}
</script>

<template>
  <div class="settings-page">
    <div class="sliders-container">
      <label for="master-volume" class="slider-label">Master Volume</label>
      <input type="range" id="master-volume" min="0" max="100" v-model="SETTINGS.masterVolume" />
      <span class="slider-value">{{ SETTINGS.masterVolume }}</span>

      <label for="music" class="slider-label">Music</label>
      <input type="range" id="music" min="0" max="100" v-model="SETTINGS.musicVolume" />
      <span class="slider-value">{{ SETTINGS.musicVolume }}</span>

      <label for="gameplay" class="slider-label">Gameplay</label>
      <input type="range" id="gameplay" min="0" max="100" v-model="SETTINGS.gameplayVolume" />
      <span class="slider-value">{{ SETTINGS.gameplayVolume }}</span>

      <label for="background-effects" class="slider-label">Background Effects</label>
      <input type="range" id="background-effects" min="0" max="100" v-model="SETTINGS.effectsVolume" />
      <span class="slider-value">{{ SETTINGS.effectsVolume }}</span>

      <label for="language" class="slider-label">Language</label>
      <select v-model="SETTINGS.selectedLanguage" class="language-select">
        <option value="English">English</option>
        <option value="Japanese">Japanese</option>
      </select>

      <!-- Centered Confirm button -->
      <button @click="confirm" class="confirm-button">Confirm Changes</button>
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
  grid-template-rows: auto auto;
  align-items: center;
}

.slider-label {
  font-size: 1.3rem;
  min-width: 140px;
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

.confirm-button {
  grid-column: 1 / -1;
  justify-self: center;
  margin-top: 1.5rem;
  font-size: 1.2rem;
  padding: 0.7rem 1.5rem;
  background-color: #ea0303;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.confirm-button:hover {
  background-color: rgb(2, 159, 2);
}
</style>
