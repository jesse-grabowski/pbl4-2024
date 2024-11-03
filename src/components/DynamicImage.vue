<script setup lang="ts">
import PanoramaImage from './PanoramaImage.vue'
import type { Image } from '@/models/image'

const props = defineProps<{
  image?: Image | undefined
}>()

const emits = defineEmits<{
  (e: 'image-loaded'): void
}>()
</script>

<template>
  <div v-bind="$attrs" v-if="props.image">
    <img v-if="!props.image.isPanorama" :src="props.image.url" />
    <PanoramaImage
      v-if="props.image.isPanorama"
      class="panorama"
      :src="props.image.url"
      :haov="props.image.haov"
      :vaov="props.image.vaov"
      v-on:load="emits('image-loaded')"
    />
  </div>
</template>

<style scoped>
.panorama {
  z-index: 0;
  height: 100%;
  width: 100%;
}

img {
  object-fit: cover;
  height: 100%;
  width: 100%;
}
</style>
