<script setup lang="ts">
import PanoramaImage from './PanoramaImage.vue'

const props = defineProps<{
  image?: Image | undefined
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
