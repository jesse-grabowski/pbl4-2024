export async function readFileFromPublic(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath)
    return await response.text()
  } catch (error) {
    console.error(`Error reading file ${filePath}`, error)
    return ''
  }
}

export async function readJsonFromPublic<T>(filePath: string): Promise<T> {
  try {
    const response = await fetch(filePath)
    return await response.json()
  } catch (error) {
    console.error(`Error reading json file ${filePath}`, error)
    return {} as T
  }
}
