<script setup lang="ts">
import { LeaderboardCredential } from '@/data/leaderboard-credential'
import type { GameRecord } from '../models/record'

const url = LeaderboardCredential.url
const topscores = ref<GameRecord[]>()

function truncateString(str: string, num: number) {
  if (str.length <= num) {
    return str
  }
  return str.slice(0, num) + '...'
}

async function fetchData() {
  const response = await fetch(url)
  const data = await response.json()

  topscores.value = data.result
    .map((result: { user: string; score: string }) => {
      const [date, time, score, campus] = result.score.split(',')
      return { user: truncateString(result.user, 20), score: Number(score), date: date, time: time, campus: campus }
    })
    .filter((record: GameRecord) => {
      const recordDate = new Date(record.date)
      const cutoffDate = new Date()
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)

      return recordDate >= cutoffDate
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
        <th class="mobile-hidden">Date</th>
        <th class="mobile-hidden">Time</th>
        <th>Score</th>
        <th class="mobile-hidden">Campus</th>
      </tr>
    </thead>
    <tbody v-if="topscores != null">
      <tr v-for="(record, index) in topscores" :key="index">
        <td>{{ index + 1 }}</td>
        <td>{{ record.user }}</td>
        <td class="mobile-hidden">{{ record.date }}</td>
        <td class="mobile-hidden">{{ record.time }}</td>
        <td>{{ record.score }}</td>
        <td class="mobile-hidden">{{ record.campus }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style>
#table {
  border: 4px solid black;
}

#table th {
  background-color: rgba(0, 0, 0, 0.7);
}

#table thead,
tbody {
  border: 1px solid #000;
}

#table thead th,
tbody td {
  border: 1px solid black;
  text-align: left;
}


@media screen and (max-width: 480px) {
  .mobile-hidden {
    display: none;
  }
}
</style>
