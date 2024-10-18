export async function readTextFromFile(filePath: string): Promise<string> {
  return readFromFile(filePath, async response => await response.text())
}

export async function readJsonFromFile<T>(filePath: string): Promise<T> {
  return readFromFile(filePath, async response => await response.json())
}

export async function readImageFromFile(filePath: string): Promise<string> {
  return readFromFile(filePath, async response => URL.createObjectURL(await response.blob()))
}

export async function readFromFile<T>(
  filePath: string,
  processResponseAction: (response: Response) => Promise<T>,
): Promise<T> {
  try {
    const response = await fetch(filePath)
    return await processResponseAction(response)
  } catch (error) {
    console.error(`Error reading file`, error)
    return {} as T
  }
}
