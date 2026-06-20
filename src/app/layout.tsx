import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import PWARegister from '@/components/PWARegister'
import StatusBar from '@/components/StatusBar'

export const metadata: Metadata = {
  title: 'Bengkel POS — Sistem Manajemen Bengkel',
  description: 'Sistem POS modern untuk bengkel motor, mobil, dan alat berat',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bengkel POS',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#0F1623',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body>
        <PWARegister />
        <Providers>
          <StatusBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
