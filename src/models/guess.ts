export interface Guess {
    correct: boolean,
    distance: number,
    guess: Coordinates,
    actual: Coordinates,
    time: string,
    stage: string
}

export interface Coordinates {
    latitude: number,
    longitude: number
}