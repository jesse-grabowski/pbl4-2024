export async function readTextFromFile(filePath: string): Promise<string> {
  return readAndProcessFile(filePath, async response => await response.text())
}

export async function readJsonFromFile<T>(filePath: string): Promise<T> {
  return readAndProcessFile(filePath, async response => await response.json())
}

export async function readFromFile(filePath: string): Promise<Response> {
  try {
    const response = await fetch(filePath)
    if (!response.ok) throw new Error(`Failed to read file: ${filePath}`)
    return response
  } catch (error) {
    console.error(`Error reading file`, error)
    return {} as Response
  }
}

export async function readAndProcessFile<T>(
  filePath: string,
  processResponseAction: (response: Response) => Promise<T>,
): Promise<T> {
  try {
    const response = await fetch(filePath)
    if (!response.ok) throw new Error(`Failed to read file: ${filePath}`)
    return await processResponseAction(response)
  } catch (error) {
    console.error(`Error reading file`, error)
    return {} as T
  }
}
