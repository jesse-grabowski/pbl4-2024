import type { Image } from "@/models/image";

const imageData: Image[] = [
    {
        "description": "This place is used  for exhibition of university informnation to people",
        "floor": 1,
        "isPanorama": false,
        "latitude": 34.8096057,
        "longitude": 135.5615734,
        "title": "lounge on the first floor in H",
        "url": new URL('@/assets/images/guess/oic-1.jpg', import.meta.url).href,
        "haov": 0,
        "vaov": 0
    },
    {
        "description": "Rei is staring at me",
        "floor": 3,
        "isPanorama": false,
        "latitude": 34.8090273,
        "longitude": 135.5615322,
        "title": "H323",
        "url": new URL('@/assets/images/guess/oic-2.jpg', import.meta.url).href,
        "haov": 0,
        "vaov": 0
    },
    {
        "description": "Outside",
        "floor": 1,
        "isPanorama": true,
        "latitude": 34.8090273,
        "longitude": 135.5615322,
        "title": "Outside",
        "url": new URL('@/assets/images/guess/oic-3.jpg', import.meta.url).href,
        "haov": 240,
        "vaov": 75
    }
]

export default imageData;