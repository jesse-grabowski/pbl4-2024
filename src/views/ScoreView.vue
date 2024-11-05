<script setup lang="ts">
import { UserInfo } from '@/data/user-info'
import { sum } from 'es-toolkit'
import router from '@/router'

const roundScores: number[] = UserInfo.value.scores as number[]
const finalScore = sum(roundScores)
const correctGuesses = UserInfo.value.corrects
function playAgain() {
  router.push('/game')
}
</script>

<template>
  <div class="game-summary">
    <div class="congratulations-message">
      Congratulations, <span class="player-name">{{ UserInfo.name }}</span> ! You guessed
      <span class="correct-guesses">{{ correctGuesses }}</span> out of 10 and accumulated
      <span class="total-points">{{ finalScore }}</span> points!
    </div>

    <div class="summary-table">
      <div class="summary-title">Game Summary:</div>
      <div class="round-details">
        <div v-for="(score, index) in roundScores" :key="index" class="round-score">
          ROUND {{ index + 1 }}: <span class="score">{{ score }}</span>
        </div>

        <div class="final-score-label">FINAL SCORE:</div>
        <div class="final-score">{{ finalScore }}</div>
      </div>
    </div>

    <button @click="playAgain" class="play-again-button">PLAY AGAIN!</button>
  </div>
</template>

<style scoped>
.game-summary {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-family: Arial, sans-serif;
  overflow-y: auto;
  box-sizing: border-box;
}

.congratulations-message,
.summary-table {
  max-width: 800px;
  width: 90%;
}

.congratulations-message {
  font-size: 2rem;
  background-color: rgba(60, 60, 60, 0.9);
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 3rem;
  text-align: center;
}

.player-name,
.correct-guesses,
.total-points {
  color: limegreen;
  font-weight: bold;
}

.summary-table {
  background-color: rgba(50, 50, 50, 0.9);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 3rem;
}

.summary-title {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  text-align: center;
}

.round-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.round-score {
  font-size: 1.5rem;
  padding: 1rem;
  background-color: rgba(100, 100, 150, 0.9);
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
}

.score {
  font-weight: bold;
  color: white;
}

.final-score-label {
  font-weight: bold;
  font-size: 1.5rem;
}

.final-score {
  color: limegreen;
  font-weight: bold;
  font-size: 1.5rem;
}

.play-again-button {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 1rem 2rem;
  font-size: 1.5rem;
  font-family: Arial, sans-serif;
  font-weight: bold;
  background-color: white;
  color: black;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.3s;
  z-index: 2;
}

.play-again-button:hover {
  background-color: gray;
  color: white;
}
</style>
