<script setup lang="ts">
import { LeaderboardCredential } from '@/data/leaderboard-credential'
import type { GameRecord } from '../models/record'

const url = LeaderboardCredential.url

const topscores = ref<GameRecord[]>([])

async function fetchData() {
  const response = await fetch(url)
  const data = await response.json()

  topscores.value = data.result
    .map((record: GameRecord) => {
      const [date, time, score, campus] = String(record.score).split(',')
      return { user: record.user, score: Number(score), date: date, time: time, campus: campus }
    })
    .sort((a: GameRecord, b: GameRecord) => b.score - a.score)
    .slice(0, 10)
}

onMounted(async () => {
  await fetchData()
})
</script>

<template>
  <table id="table">
    <thead>
      <tr>
        <th>No.</th>
        <th>Name</th>
        <th>Date</th>
        <th>Time</th>
        <th>Score</th>
        <th>Campus</th>
      </tr>
    </thead>
    <tbody v-if="topscores != null">
      <tr v-for="(record, index) in topscores" :key="index">
        <td>{{ index + 1 }}</td>
        <td>{{ record.user }}</td>
        <td>{{ record.date }}</td>
        <td>{{ record.time }}</td>
        <td>{{ record.score }}</td>
        <td>{{ record.campus }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style>
#table {
  border: 4px solid black;
  width: auto;
  height: 600px;
  overflow-y: auto;
  display: block;
}

#table th {
  background-color: rgba(0, 0, 0, 0.7);
}

#table thead,
tbody {
  border: 1px solid #000;
  width: 100%;
}

#table thead th,
tbody td {
  border: 1px solid black;
  width: 7%;
  text-align: left;
}
</style>
