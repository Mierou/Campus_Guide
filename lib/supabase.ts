import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: number
  username: string
  full_name: string
  role: 'Admin' | 'User'
}

export type ParkingLot = {
  id: number
  lot_name: string
  departments: string
  hours: string
  latitude: number
  longitude: number
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

export type Building = {
  id: number
  name: string
  abbreviation: string
  departments: string
  hours: string
  image_file: string
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
  services: string
  hours: string
  image_file: string
  latitude: number
  longitude: number
  is_open: boolean
}

export type ReservationHistory = {
  id: number
  spot_id: number
  user_id: number
  vehicle_type: string
  time_start: string
  time_end: string
  reservation_date: string
  status: string
  full_name?: string
  spot_code?: string
  lot_name?: string
}
