import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVfm } from 'vue-final-modal'

import App from './App.vue'
import router from './router'

import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { FaExpandArrowsAlt, FaCompressArrowsAlt, FaHamburger } from 'oh-vue-icons/icons'

import 'vue-final-modal/style.css'

addIcons(FaExpandArrowsAlt, FaCompressArrowsAlt, FaHamburger)

const app = createApp(App)
app.component('v-icon', OhVueIcon)
app.use(createPinia())
app.use(router)
app.use(createVfm())

app.config.errorHandler = (err, vm, info) => {
  console.error('Error', err, vm, info)
}

app.mount('#app')
