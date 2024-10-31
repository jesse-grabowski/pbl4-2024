<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ModalsContainer } from 'vue-final-modal'
</script>

<template>
  <div class="container">
    <header>
      <div class="mobile-header">
        <img alt="Vue logo" class="logo" src="@/assets/logo.png" width="125" height="125" />
        <label for="toggleNavigation" class="mobile-only">
          <v-icon name="fa-hamburger" scale="2" />
        </label>
      </div>
      <input id="toggleNavigation" class="mobile-only" type="checkbox" value="false" />
      <nav>
        <ul>
          <li><RouterLink to="/">Home</RouterLink></li>
          <li><RouterLink to="/leaderboard">Leaderboard</RouterLink></li>
          <li>Settings</li>
          <li>Game Information</li>
          <li>About Us</li>
        </ul>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <ModalsContainer />
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.mobile-header {
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0px 10px;
}

header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
}

main {
  max-height: calc(100vh - 4rem);
  max-height: calc(100dvh - 4rem);
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
    align-items: center;
    justify-content: stretch;

    & li {
      margin: 0px 10px;
    }
  }
}

.mobile-only {
  display: none;
}

#toggleNavigation {
  position: absolute;
  opacity: 0;
}

@media screen and (max-width: 1024px) {
  header {
    min-height: 4rem;
    flex-direction: column;
    align-items: stretch;
  }

  .mobile-only {
    display: inline-block;
  }

  #toggleNavigation:not(:checked) ~ nav {
    display: none;
  }

  #toggleNavigation:checked ~ nav ul {
    flex-direction: column;
  }
}
</style>
