import { type Coordinates } from '@/models/guess'

export interface MapConfig{
    apikey: string,
    center: Coordinates
    zoomcontrol: boolean,
    maptypecontrol: boolean,
    streetviewcontrol: boolean,
    map_styles: any[],
    zoom: number,
}