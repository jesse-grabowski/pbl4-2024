<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="container">
    <header>
      <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

      <nav>
        <ul>
          <li><RouterLink to="/">Home</RouterLink></li>
          <li>Leaderboards</li>
          <li>Settings</li>
          <li>Game Information</li>
          <li>About Us</li>
        </ul>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  height: 4rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

main {
  flex-grow: 1;
  display: flex;
  align-items: stretch;
  justify-items: stretch;
}

.logo {
  height: 3rem;
}

nav {
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
</style>
