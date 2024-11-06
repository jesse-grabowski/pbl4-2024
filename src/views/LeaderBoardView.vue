<script setup lang="ts">
import Leaderboard from '../components/LeaderBoard.vue'
</script>

<template>
  <div class="leaderboard">
    <div class="title">
      <h1>LeaderBoard</h1>
    </div>

    <Leaderboard class="board"></Leaderboard>
  </div>
  <div class="box"></div>
</template>

<style scoped>
.leaderboard {
  flex-grow: 1;
  background-color: aliceblue;
  background-image: url('@/assets/images/background_oic.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;

  display: grid;
  grid-template-columns: 5rem 1fr 5rem;
  grid-template-rows: 5rem 1rem 1fr 5rem;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
}

.leaderboard::before {
  grid-column: 1/-1;
  grid-row: 1/-1;

  background-color: rgba(100, 0, 0, 0.5);
  content: '';
}

.board {
  color: aliceblue;
  grid-row: 3;
  grid-column: 2;
  margin: 0;
  background-color: rgba(169, 187, 212, 0.68);
}

.title {
  grid-row: 1;
  grid-column: 2;
  color: aliceblue;
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
