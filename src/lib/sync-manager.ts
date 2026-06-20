'use client'

import { getSyncQueue, removeSyncQueueItem, updateSyncQueueItem, markSynced } from './db-local'
import type { SyncQueueItem } from './db-local'

export async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch('/api/tenant', { method: 'HEAD', signal: ctrl.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

export async function syncToServer(): Promise<{ synced: number; failed: number }> {
  if (!(await isOnline())) return { synced: 0, failed: 0 }

  const queue = await getSyncQueue()
  let synced = 0
  let failed = 0

  // Sort by createdAt (oldest first)
  queue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const item of queue) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const opts: RequestInit = {
        method: item.method,
        headers,
        credentials: 'include',
      }
      if (item.body && item.method !== 'DELETE') {
        opts.body = JSON.stringify(item.body)
      }

      const res = await fetch(item.endpoint, opts)

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        // Mark the source record as synced
        if (item.body?._localId) {
          const storeMap: Record<string, 'workOrders' | 'transaksi' | 'spareParts'> = {
            '/api/wo': 'workOrders',
            '/api/transaksi': 'transaksi',
            '/api/sparepart': 'spareParts',
          }
          // Determine store from endpoint
          let storeName: 'workOrders' | 'transaksi' | 'spareParts' | null = null
          for (const [prefix, store] of Object.entries(storeMap)) {
            if (item.endpoint.startsWith(prefix)) {
              storeName = store
              break
            }
          }
          if (storeName && data?.id) {
            await markSynced(item.body._localId, storeName, data.id)
          }
        }
        await removeSyncQueueItem(item._queueId)
        synced++
      } else if (res.status === 422) {
        // Validation error — remove from queue (don't retry bad data)
        await removeSyncQueueItem(item._queueId)
        failed++
      } else if (res.status >= 500) {
        // Server error — retry
        item.retries++
        if (item.retries > 3) {
          await removeSyncQueueItem(item._queueId)
        } else {
          await updateSyncQueueItem(item)
        }
        failed++
      } else {
        // Client error — remove (bad request, auth, etc.)
        await removeSyncQueueItem(item._queueId)
        failed++
      }
    } catch {
      // Network error — retry
      item.retries++
      if (item.retries > 3) {
        await removeSyncQueueItem(item._queueId)
      } else {
        await updateSyncQueueItem(item)
      }
      failed++
    }
  }

  if (synced > 0) {
    localStorage.setItem('lastSync', new Date().toISOString())
  }

  return { synced, failed }
}

export async function checkAndSync(): Promise<void> {
  if (navigator.onLine) {
    await syncToServer()
  }
}

let _initialized = false

export function initSync(): void {
  if (_initialized) return
  _initialized = true
  window.addEventListener('online', () => {
    setTimeout(() => syncToServer(), 2000)
  })
}

export function getSyncStatus(): { pending: number; lastSync: string | null } {
  const lastSync = localStorage.getItem('lastSync')
  return { pending: 0, lastSync } // pending count comes from context
}
