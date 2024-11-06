<script setup lang="ts">
import { UserInfo } from '@/data/user-info'
import router from '@/router'

onUnmounted(() => {
  if (router.currentRoute.value.path === '/game' && !UserInfo.value.name) router.replace('/')
})
</script>

<template>
  <div class="home">
    <div class="content">
      <div class="form">
        <RouterLink to="/game" class="start">Start Game!</RouterLink>
        <label>
          <span class="label">Campus</span>
          <select class="campus" v-model="UserInfo.campus">
            <option value="OIC">Ritsumeikan OIC</option>
          </select>
        </label>
        <input class="name" type="text" v-model="UserInfo.name" placeholder="Enter Name Here" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  flex-grow: 1;
  background-color: aliceblue;
  background-image: url('@/assets/images/background_oic.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;

  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: 1fr auto 1fr;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
}

.content {
  grid-column-start: 2;
  grid-row-start: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;

  font-size: 22px;
  color: white;
}

.home::before {
  grid-column: 1/-1;
  grid-row: 1/-1;

  background-color: rgba(100, 0, 0, 0.5);
  content: '';
}

/* Button style lifted from https://codepen.io/desandro/pen/KqQbaq */
.start {
  position: relative;
  background-color: rgba(150, 150, 200, 0.5);
  background-image: linear-gradient(
    /* chrome */ hsla(0, 0%, 100%, 0.6),
    hsla(0, 0%, 100%, 0) 50%,
    hsla(0, 0%, 0%, 0.3) 50%,
    hsla(0, 0%, 100%, 0.2)
  );
  font-weight: bold;
  padding: 20px 40px;
  text-align: center;
  text-shadow:
    0 0 15px hsla(0, 0%, 100%, 1),
    /* bloom */ 0 2px 4px hsla(0, 0%, 0%, 0.7); /* drop shadow */
  border: none;
  border-radius: 25px;
  box-shadow:
    inset 0 -5px 20px hsla(0, 0%, 0%, 0.4),
    /* top light */ inset 0 5px 20px hsla(0, 0%, 100%, 0.4),
    /* bottom shadow */ /* multiple light sources yall */ -8px 8px 5px hsla(0, 0%, 0%, 0.15),
    /* drop shadow 1 */ 5px 18px 10px hsla(0, 0%, 0%, 0.2); /* drop shadow 2 */
  cursor: pointer;
  transition:
    transform 0.1s,
    box-shadow 0.1s;
}

.start:focus {
  outline: none;
}

.start::before {
  content: '';
  display: block;
  position: absolute;
  left: 10px;
  right: 10px;
  top: 5px;
  height: 30px;
  border-radius: 15px;
  background: linear-gradient(hsla(0, 0%, 100%, 0.8), hsla(0, 0%, 100%, 0));
}

.start:hover {
  transform: scale(1.05);
  box-shadow:
    inset 0 -5px 20px hsla(0, 0%, 0%, 0.4),
    /* top light */ inset 0 5px 20px hsla(0, 0%, 100%, 0.4),
    /* bottom shadow */ /* multiple light sources yall */ -12px 12px 5px hsla(0, 0%, 0%, 0.15),
    /* drop shadow 1 */ 10px 25px 10px hsla(0, 0%, 0%, 0.2); /* drop shadow 2 */
}

.label {
  background-color: rgba(0, 0, 0, 0.5);
  margin-inline-end: 5px;
  border-top-left-radius: 15px;
  border-bottom-left-radius: 15px;
  font-weight: bold;
  padding: 5px;
}

.campus {
  background-color: rgba(150, 150, 200, 0.5);
  border-top-right-radius: 15px;
  border-bottom-right-radius: 15px;
  padding: 5px;
}

.campus:focus {
  outline: none;
}

.name {
  background-color: rgba(150, 150, 200, 0.5);
  border: 1px solid black;
  border-radius: 15px;
  text-align: center;
  color: black;
}

.name:focus {
  outline: none;
}

.name::placeholder {
  color: black;
}
</style>
