'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSyncQueueCount } from './db-local'

interface OfflineContextType {
  isOnline: boolean
  pendingSync: number
  lastSync: string | null
  triggerSync: () => Promise<void>
  setLastSync: (ts: string) => void
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSync: 0,
  lastSync: null,
  triggerSync: async () => {},
  setLastSync: () => {},
})

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [lastSync, setLastSyncState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('lastSync')
    return null
  })

  const setLastSync = useCallback((ts: string) => {
    setLastSyncState(ts)
    localStorage.setItem('lastSync', ts)
  }, [])

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount()
      setPendingSync(count)
    } catch { /* ignore */ }
  }, [])

  // Trigger sync — will be overridden by sync-manager
  const triggerSync = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const mod = await import('./sync-manager')
      await mod.syncToServer()
      await updatePendingCount()
    } catch { /* ignore */ }
  }, [updatePendingCount])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    updatePendingCount()

    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      setTimeout(() => triggerSync(), 1000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Poll pending count every 30s
    const interval = setInterval(updatePendingCount, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [triggerSync, updatePendingCount])

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSync, lastSync, triggerSync, setLastSync }}>
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => useContext(OfflineContext)
