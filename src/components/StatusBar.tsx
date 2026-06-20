'use client'

import { useEffect, useState } from 'react'
import { useOffline } from '@/lib/offline-context'

export default function StatusBar() {
  const { isOnline, pendingSync, lastSync, triggerSync } = useOffline()
  const [syncing, setSyncing] = useState(false)
  const [showBar, setShowBar] = useState(true)

  // Hide after 5s if synced and online (unless user hovers)
  useEffect(() => {
    if (isOnline && pendingSync === 0 && !syncing) {
      const t = setTimeout(() => setShowBar(false), 5000)
      return () => clearTimeout(t)
    }
    setShowBar(true)
  }, [isOnline, pendingSync, syncing])

  const handleSync = async () => {
    setSyncing(true)
    await triggerSync()
    setSyncing(false)
  }

  const bgColor = !isOnline
    ? '#DC2626'
    : syncing || pendingSync > 0
    ? '#D97706'
    : '#059669'

  const label = !isOnline
    ? `🔴 Offline — ${pendingSync} transaksi menunggu sync`
    : syncing
    ? '🟡 Menyync...'
    : pendingSync > 0
    ? `🟡 Online — ${pendingSync} transaksi menunggu sync`
    : '🟢 Online — tersync'

  const lastSyncTime = lastSync
    ? new Date(lastSync).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  if (!showBar && isOnline && pendingSync === 0) return null

  return (
    <div
      onMouseEnter={() => setShowBar(true)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 28,
        background: bgColor,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 500,
        zIndex: 9999,
        gap: 8,
        transition: 'background 0.3s',
      }}
    >
      <span>{label}</span>
      {lastSyncTime && (
        <span style={{ opacity: 0.7, fontSize: 10 }}>Terakhir sync: {lastSyncTime}</span>
      )}
      {pendingSync > 0 && isOnline && !syncing && (
        <button
          onClick={handleSync}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '1px 8px',
            borderRadius: 4,
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Sync Sekarang
        </button>
      )}
    </div>
  )
}
