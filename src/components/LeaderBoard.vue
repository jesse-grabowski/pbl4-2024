<script setup lang="ts">
  import { onMounted } from 'vue';

  const id = 'tpbH0M4HiGifjDCgz6Qc'
  var url = `https://us-central1-js-capstone-backend.cloudfunctions.net/api/games/${id}/scores/`
  

  async function fetchData() {
    const list = document.getElementById('list');
    const response = await fetch(url);
    const data = await response.json();
    
    let topscores = data.result.map((item: any) => {
      const [score, date, time, department, campus] = item.score.split(',');
      return { user: item.user, score, date, time, department, campus };
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 10);
    
    if (list) {
      list.innerHTML = '';
      topscores.forEach((e: any, index: any) => {
      list.innerHTML += `<li>
        <p>${index + 1}</p>
        <p>${e.user}</p>
        <p>${e.date}</p>
        <p>${e.score}</p>
        <p>${e.time}</p>
        <p>${e.department}</p>
        <p>${e.campus}</p>`
      });
    }
    };
    console.log("Fetched.");

  onMounted(() => {
    fetchData();
  });
;
</script>

<template>
    <div id="root">
        <button id='refresh' @click="fetchData">Fetch</button>
        <div class="board">
            <h3 class="scores-list" id="list-header">
                <li><p>No.</p> <p>Name</p> <p>Date</p> <p>Time</p> <p>Score</p> <p>Department</p> <p>Campus</p></li>
            </h3>
            <ul class="scores-list" id="list"></ul>
        </div>
    </div>
</template>

<style>
    #refresh {
        width: 100%;
        height: 20%;
        margin: auto;
        margin-right: 4%;
    }

    #root {
        display: flex;
        flex-direction: row;
    }

    .board {
        width: auto;
        height: auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 4px solid black;
        grid-template-rows:1fr 2fr;
    }

    #list-header {
        height:auto;
        background-color: gray;
    }

    .scores-list {
        vertical-align:top;
        padding: 0;
        list-style-type: none;
        width: 1200px;
        height: 300px;
        overflow-y: auto;
    }

    .scores-list li {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
        padding-left: 20px;
    }

    .scores-list p {
        font-size: 18px;
        font-weight: 700;
    }

    .scores-list li:nth-child(2n) {
        background-color: #eae8e8;
    }
</style>