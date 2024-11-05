import { randomInt } from 'es-toolkit'
import ImageData from '@/data/image-data'
import type { Image } from '@/models/image'

const images: Image[] = ImageData
const guessedImageSet = new Set<number>()

export async function getRandomImage(): Promise<Image | undefined> {
  // a temp return for now because we don't have enough images, after getting 10+ images we can remove this if statement
  if (guessedImageSet.size === images.length) {
    return undefined
  }
  let randomIndex
  do {
    randomIndex = randomInt(0, images.length)
  } while (guessedImageSet.has(randomIndex))
  const image = images[randomIndex]
  guessedImageSet.add(randomIndex)
  return image
}

export function resetGuessedImageSet() {
  guessedImageSet.clear()
}
