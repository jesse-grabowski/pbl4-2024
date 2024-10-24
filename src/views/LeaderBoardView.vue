<script setup lang="ts">
  import Leaderboard from '../components/LeaderBoard.vue'
</script>

<template>
  <div class="leaderboard">
    <div class="campuses">
    <ul class="campus-links">
      <li>Osaka Ibaraki</li>
      <li>Biwako-Kusatsu</li>
      <li>Kinugasa</li>
    </ul>
    </div>
    
    <div class='board'>
      <Leaderboard></Leaderboard>
    </div>

  </div>
</template>

<style scoped>
.leaderboard {
  flex-grow: 1;
  background-color: aliceblue;
  background-color: rgba(100, 0, 0, .5);
  background-image: url('@/assets/images/background_oic.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  flex-grow: 1;
  
  display: grid;
  grid-template-columns: 5rem 1fr 5rem;
  grid-template-rows: 5rem 5rem 1fr 5rem;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
}

.campuses {

  grid-row: 2;
  grid-column:2;
  font-weight: bold;
  font-size: 1.5rem;
  & ul {
    display: flex;
    flex-direction: row;

    & li {
      margin: 0px 10px;
    }
  }
}

.campus-links li:not(:first-of-type) {
  border-left: 3px solid black;
  padding: 0% 20px;
}

.board {
  grid-row: 3;
  grid-column:2;
  border: 4px solid black;
  background-color:rgba(169, 187, 212, 0.68);

}
</style>
