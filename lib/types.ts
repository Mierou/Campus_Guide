export type Location = {
  name: string
  lat: number
  lng: number
  type: string
  is_open: boolean
  hours: string
  tags: string[]
}

export type Building = {
  id: number
  name: string
  abbreviation: string
  departments: string[]
  hours: string
  latitude: number
  longitude: number
  filter_category: string
  is_open: boolean
}

export type Facility = {
  id: number
  name: string
  emoji: string
  category: string
  services: string[]
  hours: string
  latitude: number
  longitude: number
  is_open: boolean
}

export type ParkingLot = {
  id: number
  lot_name: string
  departments: string
  hours: string
  latitude: number
  longitude: number
  rows: number
  cols: number
}

export type ParkingSpot = {
  id: number
  lot_id: number
  spot_code: string
  row_num: number
  col_num: number
  status: 'Available' | 'Occupied' | 'Reserved'
  reserved_label: string
}

export type RouteRecord = {
  id: number
  from_location: string
  to_location: string
  waypoints: { lat: number; lng: number }[]
  distance_m?: number
}

export type HistoryRecord = {
  id: number
  spot_id: number
  user_id: number
  vehicle_type: string
  time_start: string
  reservation_date: string
  status: string
  users?: { full_name: string }
  parking_spots?: { spot_code: string; parking_lots?: { lot_name: string } }
}
