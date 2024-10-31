import { Chance } from 'chance'
import ImageData from '@/data/image-data'
import type { Image } from '@/models/image'

const images: Image[] = ImageData
const guessedImageSet = new Set<number>()

export async function getRandomImage(): Promise<Image | undefined> {
  // a temp return for now because we don't have enough images, after getting 10+ images we can remove this if statement
  if (guessedImageSet.size === images.length) {
    return undefined
  }
  let randomInt
  do {
    randomInt = Chance().integer({ min: 0, max: images.length - 1 })
  } while (guessedImageSet.has(randomInt))
  const image = images[randomInt]
  guessedImageSet.add(randomInt)
  return image
}
