export async function readTextFromFile(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath)
    return await response.text()
  } catch (error) {
    console.error(`Error reading file ${filePath}`, error)
    return ''
  }
}

export async function readJsonFromFile<T>(filePath: string): Promise<T> {
  try {
    const response = await fetch(filePath)
    return await response.json()
  } catch (error) {
    console.error(`Error reading json file ${filePath}`, error)
    return {} as T
  }
}

export async function readImageFromFile(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error(`Error reading image file ${filePath}`, error)
    return ''
  }
}