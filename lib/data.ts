export const BUILDINGS = [
  { id: 1, name: 'RTL Building', abbreviation: 'RTL', departments: ['Computer Science', 'Information Technology'], hours: '8:00 AM – 5:00 PM', latitude: 10.29474, longitude: 123.88059, filter_category: 'Engineering', is_open: true },
  { id: 2, name: 'GLE Building', abbreviation: 'GLE', departments: ['Computer Engineering', 'Electronics Engineering'], hours: '8:00 AM – 5:00 PM', latitude: 10.29526, longitude: 123.88125, filter_category: 'Engineering', is_open: true },
  { id: 3, name: 'Acad Building', abbreviation: 'ACAD', departments: ['Allied Health', 'Education'], hours: '8:00 AM – 5:00 PM', latitude: 10.29576, longitude: 123.88109, filter_category: 'Health', is_open: true },
  { id: 4, name: 'SAL Building', abbreviation: 'SAL', departments: ['Social Sciences', 'Liberal Arts'], hours: '8:00 AM – 5:00 PM', latitude: 10.29563, longitude: 123.87980, filter_category: 'Education', is_open: false },
  { id: 5, name: 'NGE Building', abbreviation: 'NGE', departments: ['Nursing', 'Graduate Education'], hours: '8:00 AM – 5:00 PM', latitude: 10.29436, longitude: 123.88107, filter_category: 'Health', is_open: true },
  { id: 6, name: 'ALLIED Building', abbreviation: 'ALY', departments: ['Allied Health', 'Education'], hours: '8:00 AM – 5:00 PM', latitude: 10.29449, longitude: 123.87991, filter_category: 'Health', is_open: true },
  { id: 7, name: 'Elementary Building', abbreviation: 'ELEM', departments: ['Elementary Education'], hours: '7:00 AM – 5:00 PM', latitude: 10.29646, longitude: 123.88039, filter_category: 'Education', is_open: true },
  { id: 8, name: 'GLEC Building', abbreviation: 'GLEC', departments: ['Graduate Education', 'Continuing Education'], hours: '8:00 AM – 5:00 PM', latitude: 10.29546, longitude: 123.88021, filter_category: 'Education', is_open: false },
]

export const FACILITIES = [
  { id: 1, name: 'Canteen', emoji: '🍽️', category: 'Food', services: ['Food Services', 'Student Dining'], hours: '7:00 AM – 7:00 PM', latitude: 10.29608, longitude: 123.88052, is_open: true },
  { id: 2, name: 'Covered Court', emoji: '🏀', category: 'Sports', services: ['Sports Events', 'Intramurals'], hours: '6:00 AM – 10:00 PM', latitude: 10.29605, longitude: 123.88019, is_open: true },
  { id: 3, name: 'GYM', emoji: '💪', category: 'Sports', services: ['Fitness Center', 'Weight Training'], hours: '5:00 AM – 11:00 PM', latitude: 10.29628, longitude: 123.87951, is_open: true },
  { id: 4, name: 'College Library', emoji: '📚', category: 'Academic', services: ['Library Services', 'Research'], hours: '8:00 AM – 9:00 PM', latitude: 10.29524, longitude: 123.88083, is_open: true },
  { id: 5, name: 'Espacio', emoji: '☕', category: 'Leisure', services: ['Student Lounge', 'Study Area', 'Café'], hours: '7:30 AM – 9:00 PM', latitude: 10.29563, longitude: 123.88070, is_open: true },
]

export const LOCATIONS = [
  { name: 'RTL Building', latitude: 10.29474, longitude: 123.88059 },
  { name: 'GLE Building', latitude: 10.29526, longitude: 123.88125 },
  { name: 'Acad Building', latitude: 10.29576, longitude: 123.88109 },
  { name: 'SAL Building', latitude: 10.29563, longitude: 123.87980 },
  { name: 'NGE Building', latitude: 10.29436, longitude: 123.88107 },
  { name: 'ALLIED Building', latitude: 10.29449, longitude: 123.87991 },
  { name: 'GLEC Building', latitude: 10.29546, longitude: 123.88021 },
  { name: 'Elementary Building', latitude: 10.29646, longitude: 123.88039 },
  { name: 'College Library', latitude: 10.29524, longitude: 123.88083 },
  { name: 'GYM', latitude: 10.29628, longitude: 123.87951 },
  { name: 'Covered Court', latitude: 10.29605, longitude: 123.88019 },
  { name: 'Canteen', latitude: 10.29608, longitude: 123.88052 },
  { name: 'Espacio', latitude: 10.29563, longitude: 123.88070 },
]

export const ROUTES: Record<string, { lat: number; lng: number }[]> = {
  'RTL Building|GLE Building': [
    { lat: 10.29484, lng: 123.88097 },
    { lat: 10.29487, lng: 123.88107 },
    { lat: 10.29507, lng: 123.88101 },
    { lat: 10.29509, lng: 123.88111 },
  ],
  'GLE Building|RTL Building': [
    { lat: 10.29509, lng: 123.88111 },
    { lat: 10.29507, lng: 123.88101 },
    { lat: 10.29487, lng: 123.88107 },
    { lat: 10.29484, lng: 123.88097 },
  ],
  'GLE Building|College Library': [
    { lat: 10.29509, lng: 123.88111 },
    { lat: 10.29517, lng: 123.88098 },
    { lat: 10.29528, lng: 123.88094 },
    { lat: 10.29524, lng: 123.88083 },
  ],
  'College Library|GLE Building': [
    { lat: 10.29524, lng: 123.88083 },
    { lat: 10.29528, lng: 123.88094 },
    { lat: 10.29517, lng: 123.88098 },
    { lat: 10.29509, lng: 123.88111 },
  ],
  'GLE Building|Acad Building': [
    { lat: 10.29530, lng: 123.88120 },
    { lat: 10.29532, lng: 123.88103 },
    { lat: 10.29565, lng: 123.88110 },
  ],
  'Acad Building|GLE Building': [
    { lat: 10.29565, lng: 123.88110 },
    { lat: 10.29532, lng: 123.88103 },
    { lat: 10.29530, lng: 123.88120 },
  ],
}

export const PARKING_LOTS = [
  { id: 1, lot_name: 'Backgate Parking', departments: 'General', hours: '6:00 AM – 10:00 PM', latitude: 10.29410, longitude: 123.88060, rows: 3, cols: 8 },
  { id: 2, lot_name: 'RTL Parking', departments: 'CS, IT Dept.', hours: '7:00 AM – 8:00 PM', latitude: 10.29460, longitude: 123.88040, rows: 2, cols: 6 },
  { id: 3, lot_name: 'South Lot', departments: 'General', hours: '6:00 AM – 10:00 PM', latitude: 10.29390, longitude: 123.88010, rows: 4, cols: 10 },
  { id: 4, lot_name: 'Espacio Parking', departments: 'General', hours: '7:00 AM – 9:00 PM', latitude: 10.29545, longitude: 123.88055, rows: 2, cols: 5 },
]

// Generate spots for a lot
export function generateSpots(lotId: number, rows: number, cols: number) {
  const spots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const code = `${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`
      // Random status for demo
      const rand = Math.random()
      const status = rand < 0.6 ? 'Available' : rand < 0.85 ? 'Occupied' : 'Reserved'
      spots.push({
        id: lotId * 1000 + r * 100 + c,
        lot_id: lotId,
        spot_code: code,
        row_num: r,
        col_num: c,
        status: status as 'Available' | 'Occupied' | 'Reserved',
        reserved_label: status === 'Reserved' ? 'Dean Santos' : '',
      })
    }
  }
  return spots
}
