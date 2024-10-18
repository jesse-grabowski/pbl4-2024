import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { FaExpandArrowsAlt, FaCompressArrowsAlt } from 'oh-vue-icons/icons'

import VuePannellum from 'vue-pannellum'

addIcons(FaExpandArrowsAlt, FaCompressArrowsAlt)

const app = createApp(App)
app.component('v-icon', OhVueIcon)
app.component('VPannellum', VuePannellum)
app.use(createPinia())
app.use(router)

app.config.errorHandler = (err, vm, info) => {
  console.error('Error', err, vm, info)
}

app.mount('#app')
