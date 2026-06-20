'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import { OfflineProvider } from '@/lib/offline-context'
import { initSync } from '@/lib/sync-manager'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSync()
  }, [])

  return (
    <SessionProvider>
      <OfflineProvider>
        {children}
      </OfflineProvider>
    </SessionProvider>
  )
}
