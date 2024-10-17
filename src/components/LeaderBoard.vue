<script setup lang="ts">
import { ref, onMounted, onUpdated } from 'vue';

const id = 'tpbH0M4HiGifjDCgz6Qc';
const url = `https://us-central1-js-capstone-backend.cloudfunctions.net/api/games/${id}/scores/`;

const topscores = ref([]);

async function fetchData() {
    const response = await fetch(url);
    const data = await response.json();

    topscores.value = data.result.map((item: any) => {
        const [score, date, time, department, campus] = item.score.split(',');
        return { user: item.user, score: score, date: date, time: time, department: department, campus: campus };
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 10);
}

onMounted(() => {
fetchData();
});

onUpdated(() => {
    fetchData();
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
                <th>Department</th>
                <th>Campus</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(record, index) in topscores" :key="index">
                <td>{{ index + 1 }}</td>
                <td>{{ record.user }}</td>
                <td>{{ record.date }}</td>
                <td>{{ record.time }}</td>
                <td>{{ record.score }}</td>
                <td>{{ record.department }}</td>
                <td>{{ record.campus }}</td>
            </tr>
        </tbody>
    </table>
</template>

<style>

#table {
    border: 4px solid black;
    width: 700px;
    height: 300px;
    overflow-y: auto;
    display:block;
}

#table thead, tbody {
    border: 1px solid #000;
    width:100%;
}

#table thead th, tbody td {
    border: 1px solid black;
    width: 10%;
    text-align: left;
}
</style>