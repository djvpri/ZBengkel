'use client'

// Native IndexedDB wrapper — no packages
const DB_NAME = 'bengkel-pos-offline'
const DB_VERSION = 1

export interface LocalWorkOrder {
  _localId: string
  _synced: boolean
  _syncId?: string
  id?: string
  tenantId: string
  nomorWO: string
  kendaraan: any
  mekanikIds: string[]
  mekaniks?: any[]
  status: string
  keluhan: string
  catatan: string
  estimasi?: number
  waktuMasuk: string
  waktuSelesai?: string
  createdAt: string
}

export interface LocalTransaksi {
  _localId: string
  _synced: boolean
  _syncId?: string
  id?: string
  tenantId: string
  workOrderId: string
  nomorTrx?: string
  items: any[]
  diskon: number
  total: number
  metode: string
  catatan: string
  createdAt: string
}

export interface LocalSparePart {
  _localId: string
  _synced: boolean
  _syncId?: string
  id?: string
  tenantId: string
  nama: string
  kategori: string
  satuan: string
  stok: number
  minStok: number
  hargaBeli: number
  hargaJual: number
  keterangan?: string
  createdAt: string
}

export interface SyncQueueItem {
  _queueId: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  body: any
  createdAt: string
  retries: number
}

type StoreName = 'workOrders' | 'transaksi' | 'spareParts' | 'syncQueue'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('workOrders')) {
        const ws = db.createObjectStore('workOrders', { keyPath: '_localId' })
        ws.createIndex('tenantId', 'tenantId', { unique: false })
        ws.createIndex('synced', '_synced', { unique: false })
      }
      if (!db.objectStoreNames.contains('transaksi')) {
        const ts = db.createObjectStore('transaksi', { keyPath: '_localId' })
        ts.createIndex('tenantId', 'tenantId', { unique: false })
        ts.createIndex('synced', '_synced', { unique: false })
      }
      if (!db.objectStoreNames.contains('spareParts')) {
        const ss = db.createObjectStore('spareParts', { keyPath: '_localId' })
        ss.createIndex('tenantId', 'tenantId', { unique: false })
        ss.createIndex('synced', '_synced', { unique: false })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: '_queueId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txPromise<T>(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function txPromiseVoid(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    fn(store)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function getAllByIndex<T>(storeName: StoreName, indexName: string, key: any): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const req = index.getAll(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getByKey<T>(storeName: StoreName, key: any): Promise<T | undefined> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Work Orders ──

export async function saveWorkOrder(wo: LocalWorkOrder): Promise<LocalWorkOrder> {
  if (!wo._localId) wo._localId = crypto.randomUUID()
  if (!wo.createdAt) wo.createdAt = new Date().toISOString()
  wo._synced = false
  await txPromiseVoid('workOrders', 'readwrite', s => s.put(wo))
  return wo
}

export async function getWorkOrders(tenantId: string): Promise<LocalWorkOrder[]> {
  return getAllByIndex<LocalWorkOrder>('workOrders', 'tenantId', tenantId)
}

export async function updateWorkOrder(wo: LocalWorkOrder): Promise<void> {
  await txPromiseVoid('workOrders', 'readwrite', s => s.put(wo))
}

// ── Transaksi ──

export async function saveTransaksi(trx: LocalTransaksi): Promise<LocalTransaksi> {
  if (!trx._localId) trx._localId = crypto.randomUUID()
  if (!trx.createdAt) trx.createdAt = new Date().toISOString()
  trx._synced = false
  await txPromiseVoid('transaksi', 'readwrite', s => s.put(trx))
  return trx
}

export async function getTransaksi(tenantId: string): Promise<LocalTransaksi[]> {
  return getAllByIndex<LocalTransaksi>('transaksi', 'tenantId', tenantId)
}

export async function updateTransaksi(trx: LocalTransaksi): Promise<void> {
  await txPromiseVoid('transaksi', 'readwrite', s => s.put(trx))
}

// ── Spare Parts ──

export async function saveSparePart(sp: LocalSparePart): Promise<LocalSparePart> {
  if (!sp._localId) sp._localId = crypto.randomUUID()
  if (!sp.createdAt) sp.createdAt = new Date().toISOString()
  sp._synced = false
  await txPromiseVoid('spareParts', 'readwrite', s => s.put(sp))
  return sp
}

export async function getSpareParts(tenantId: string): Promise<LocalSparePart[]> {
  return getAllByIndex<LocalSparePart>('spareParts', 'tenantId', tenantId)
}

export async function updateSparePart(sp: LocalSparePart): Promise<void> {
  await txPromiseVoid('spareParts', 'readwrite', s => s.put(sp))
}

// ── Sync Queue ──

export async function addToSyncQueue(item: Omit<SyncQueueItem, '_queueId' | 'createdAt' | 'retries'>): Promise<SyncQueueItem> {
  const queueItem: SyncQueueItem = {
    _queueId: crypto.randomUUID(),
    method: item.method,
    endpoint: item.endpoint,
    body: item.body,
    createdAt: new Date().toISOString(),
    retries: 0,
  }
  await txPromiseVoid('syncQueue', 'readwrite', s => s.put(queueItem))
  return queueItem
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction('syncQueue', 'readonly')
    const store = tx.objectStore('syncQueue')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await txPromiseVoid('syncQueue', 'readwrite', s => s.delete(id))
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  await txPromiseVoid('syncQueue', 'readwrite', s => s.put(item))
}

export async function markSynced(localId: string, store: 'workOrders' | 'transaksi' | 'spareParts', serverId?: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const s = tx.objectStore(store)
    const req = s.get(localId)
    req.onsuccess = () => {
      const record = req.result
      if (record) {
        record._synced = true
        if (serverId) record._syncId = serverId
        if (serverId) record.id = serverId
        s.put(record)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearStore(store: StoreName): Promise<void> {
  await txPromiseVoid(store, 'readwrite', s => s.clear())
}

export async function getSyncQueueCount(): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction('syncQueue', 'readonly')
    const store = tx.objectStore('syncQueue')
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function replaceAllStore<T extends { _localId: string }>(
  storeName: 'workOrders' | 'transaksi' | 'spareParts',
  tenantId: string,
  items: T[]
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const index = store.index('tenantId')
    const req = index.getAll(tenantId)
    req.onsuccess = () => {
      const existing: T[] = req.result
      // Remove old records for this tenant
      existing.forEach((item: any) => store.delete(item._localId))
      // Add new records
      items.forEach((item: any) => store.put(item))
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
