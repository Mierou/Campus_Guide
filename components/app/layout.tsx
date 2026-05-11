import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Campus Guide & Parking System',
  description: 'Navigate your campus with ease',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
