'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { rp, fmtDateTime } from '@/lib/utils'
import { saveWorkOrder, getWorkOrders, addToSyncQueue, markSynced } from '@/lib/db-local'
import { isOnline } from '@/lib/sync-manager'
import { useOffline } from '@/lib/offline-context'

const Btn = ({ onClick, children, variant = 'default', disabled }: any) => {
  const styles: any = {
    default: { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' },
    amber: { background: '#F59E0B', border: 'none', color: '#0F1623', fontWeight: 600 },
    success: { background: 'transparent', border: '0.5px solid rgba(52,211,153,0.4)', color: '#34D399' },
    danger: { background: 'transparent', border: '0.5px solid rgba(248,113,113,0.4)', color: '#F87171' },
    blue: { background: 'transparent', border: '0.5px solid rgba(96,165,250,0.4)', color: '#60A5FA' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</button>
}

export default function WOPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isOnline: isOnlineStatus } = useOffline()
  const [wos, setWOs] = useState<any[]>([])
  const [mekaniks, setMekaniks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ plat: '', jenis: 'MOTOR', merk: '', tipe: '', tahun: '', warna: '', pemilik: '', hp: '', alamat: '', keluhan: '', catatan: '', estimasi: '', mekanikIds: [] as string[] })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [tenantId, setTenantId] = useState<string>('')
  const [isOfflineData, setIsOfflineData] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') {
      const u = session?.user as any
      setTenantId(u?.tenantId || '')
    }
  }, [status, router, session])

  const load = useCallback(async () => {
    setLoading(true)
    const tid = (session?.user as any)?.tenantId || ''
    let merged: any[] = []

    // 1. Load from IndexedDB first (instant) — only if we have a tenantId
    if (tid) {
      try {
        const localWOs = await getWorkOrders(tid)
        merged = localWOs.map(w => ({ ...w, _isLocal: !w._synced, offline: true }))
      } catch { /* indexedDB unavailable */ }
    }

    // 2. Try API fetch if online
    const online = await isOnline()
    if (online && tid) {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filterStatus) params.set('status', filterStatus)
        const data = await fetch(`/api/wo?${params}`, { credentials: 'include' }).then(r => r.json())
        const serverWOs = Array.isArray(data) ? data : []

        // Mark server items
        const serverIds = new Set(serverWOs.map((w: any) => w.id))

        // Update local DB with server data
        for (const wo of serverWOs) {
          try {
            await saveWorkOrder({
              _localId: wo.id || crypto.randomUUID(),
              _synced: true,
              _syncId: wo.id,
              id: wo.id,
              tenantId: tid,
              nomorWO: wo.nomorWO || '',
              kendaraan: wo.kendaraan,
              mekanikIds: wo.mekaniks?.map((wm: any) => wm.mekanikId) || [],
              mekaniks: wo.mekaniks,
              status: wo.status,
              keluhan: wo.keluhan,
              catatan: wo.catatan || '',
              estimasi: wo.estimasi,
              waktuMasuk: wo.waktuMasuk,
              waktuSelesai: wo.waktuSelesai,
              createdAt: wo.createdAt,
            })
          } catch { /* ignore */ }
        }

        // Merge: prefer server data, append local-only items
        merged = [
          ...serverWOs,
          ...merged.filter((w: any) => !serverIds.has(w._syncId) && !serverIds.has(w._localId)),
        ]
        setIsOfflineData(false)
      } catch {
        // Network failed — rely on IndexedDB
        setIsOfflineData(true)
      }
    } else if (tid) {
      setIsOfflineData(true)
    }

    setWOs(merged)
    setLoading(false)
  }, [search, filterStatus, session, setIsOfflineData])

  useEffect(() => {
    if (status === 'authenticated') {
      load()
      fetch('/api/mekanik', { credentials: 'include' }).then(r => r.json()).then(d => setMekaniks(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [status, load])

  const toggleMek = (id: string) => setForm(f => ({ ...f, mekanikIds: f.mekanikIds.includes(id) ? f.mekanikIds.filter(x => x !== id) : [...f.mekanikIds, id] }))

  const saveWO = async () => {
    if (!form.plat || !form.pemilik || !form.keluhan) { setToast({ msg: 'Plat, pemilik, dan keluhan wajib!', type: 'error' }); return }
    setSaving(true)

    const online = navigator.onLine
    const tid = (session?.user as any)?.tenantId || ''

    if (online) {
      try {
        const res = await fetch('/api/wo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form),
        })
        if (res.ok) {
          setShowModal(false)
          load()
          setToast({ msg: 'Work Order berhasil dibuat!', type: 'success' })
          setSaving(false)
          return
        }
        // API failed — fall through to offline save
      } catch {
        // Network error — fall through
      }
    }

    // Offline save
    const woData = {
      _localId: crypto.randomUUID(),
      _synced: false,
      tenantId: tid,
      nomorWO: `WO-OFFLINE-${new Date().toISOString().slice(0, 10)}`,
      kendaraan: { plat: form.plat, jenis: form.jenis, merk: form.merk, tipe: form.tipe, pemilik: form.pemilik, hp: form.hp, alamat: form.alamat },
      mekanikIds: form.mekanikIds,
      mekaniks: form.mekanikIds.map((id: string) => ({ mekanikId: id })),
      status: 'ANTRI',
      keluhan: form.keluhan,
      catatan: form.catatan,
      estimasi: form.estimasi ? +form.estimasi : 0,
      waktuMasuk: new Date().toISOString(),
      waktuSelesai: undefined,
      createdAt: new Date().toISOString(),
    }

    await saveWorkOrder(woData)
    await addToSyncQueue({
      method: 'POST',
      endpoint: '/api/wo',
      body: { ...form, _localId: woData._localId, tenantId: tid },
    })

    setSaving(false)
    setShowModal(false)
    load()
    setToast({ msg: 'Work Order disimpan offline. Akan disync saat online.', type: 'success' })
  }

  const updateStatus = async (id: string, status: string) => {
    const online = await isOnline()
    if (online) {
      try {
        await fetch(`/api/wo/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) })
        load()
        setShowDetail(null)
        setToast({ msg: `Status diubah ke ${status}`, type: 'success' })
        return
      } catch { /* offline */ }
    }
    // Offline: queue it
    await addToSyncQueue({ method: 'PATCH', endpoint: `/api/wo/${id}`, body: { status } })
    load()
    setShowDetail(null)
    setToast({ msg: `Status akan diubah saat online.`, type: 'success' })
  }

  const deleteWO = async (id: string) => {
    if (!confirm('Hapus work order ini?')) return
    const online = await isOnline()
    if (online) {
      try {
        await fetch(`/api/wo/${id}`, { method: 'DELETE', credentials: 'include' })
        load()
        setToast({ msg: 'Work Order dihapus', type: 'success' })
        return
      } catch { /* offline */ }
    }
    await addToSyncQueue({ method: 'DELETE', endpoint: `/api/wo/${id}`, body: {} })
    load()
    setToast({ msg: 'Penghapusan akan disync saat online.', type: 'success' })
  }

  const statusColor: any = { ANTRI: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)'], PROSES: ['rgba(245,158,11,0.15)', '#F59E0B'], SELESAI: ['rgba(52,211,153,0.12)', '#34D399'], BAYAR: ['rgba(96,165,250,0.12)', '#60A5FA'] }
  const role = (session?.user as any)?.role

  if (status === 'loading') return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 20, paddingTop: isMobile ? 52 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isOfflineData && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '0.5px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#F59E0B' }}>
            📴 Menampilkan data offline. Data mungkin tidak lengkap.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Work Order</h1>
          {(role === 'ADMIN' || role === 'KASIR') && (
            <Btn variant="amber" onClick={() => { setForm({ plat:'',jenis:'MOTOR',merk:'',tipe:'',tahun:'',warna:'',pemilik:'',hp:'',alamat:'',keluhan:'',catatan:'',estimasi:'',mekanikIds:[] }); setShowModal(true) }}>+ WO Baru</Btn>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ flex: 1, minWidth: 120 }} placeholder="Cari plat / pemilik..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <select style={{ width: isMobile ? '100%' : 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="ANTRI">Antri</option>
            <option value="PROSES">Proses</option>
            <option value="SELESAI">Selesai</option>
            <option value="BAYAR">Sudah Bayar</option>
          </select>
          <Btn onClick={load}>Cari</Btn>
        </div>

        {/* Desktop table */}
        <div className="hide-mobile" style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
          <div className="scroll-x">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['No. WO','Kendaraan','Pemilik','Mekanik','Keluhan','Masuk','Status','Aksi'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--t3)' }}>Memuat...</td></tr>
                : wos.length === 0 ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--t3)' }}>Tidak ada data</td></tr>
                : wos.map(w => (
                  <tr key={w.id || w._localId} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#F59E0B' }}>
                      {w.nomorWO}
                      {w._isLocal && <span style={{ fontSize: 9, marginLeft: 4, color: '#D97706' }}>⏳</span>}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{w.kendaraan?.plat}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{w.kendaraan?.jenis} · {w.kendaraan?.tipe || '—'}</div>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{w.kendaraan?.pemilik}<br/><span style={{ fontSize: 10, color: 'var(--t3)' }}>{w.kendaraan?.hp}</span></td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--t2)' }}>{w.mekaniks?.map((wm: any) => wm.mekanik?.nama).join(', ') || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--t2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.keluhan}</td>
                    <td style={{ padding: '9px 12px', fontSize: 10, color: 'var(--t3)' }}>{fmtDateTime(w.waktuMasuk)}</td>
                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: (statusColor[w.status]||[])[0], color: (statusColor[w.status]||[])[1], fontWeight: 500 }}>{w.status}</span></td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn onClick={() => setShowDetail(w)}>👁</Btn>
                        {w.status === 'ANTRI' && <Btn variant="amber" onClick={() => updateStatus(w.id || w._localId, 'PROSES')}>▶</Btn>}
                        {w.status === 'PROSES' && <Btn variant="success" onClick={() => updateStatus(w.id || w._localId, 'SELESAI')}>✓</Btn>}
                        {w.status === 'SELESAI' && <Btn variant="blue" onClick={() => router.push(`/kasir?woId=${w.id || w._localId}`)}>💰</Btn>}
                        {role === 'ADMIN' && <Btn variant="danger" onClick={() => deleteWO(w.id || w._localId)}>🗑</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="hide-desktop">
          {loading ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>Memuat...</div>
          : wos.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>Tidak ada data</div>
          : wos.map(w => (
            <div key={w.id || w._localId} style={{ background: 'var(--bg2)', borderRadius: 10, border: '0.5px solid var(--border)', padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>{w.nomorWO} {w._isLocal && <span style={{ color: '#D97706' }}>⏳</span>}</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: (statusColor[w.status]||[])[0], color: (statusColor[w.status]||[])[1], fontWeight: 500 }}>{w.status}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{w.kendaraan?.plat} · {w.kendaraan?.jenis}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{w.kendaraan?.pemilik}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Keluhan: {w.keluhan}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>👷 {w.mekaniks?.map((wm: any) => wm.mekanik?.nama).join(', ') || '—'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Btn onClick={() => setShowDetail(w)}>Detail</Btn>
                {w.status === 'ANTRI' && <Btn variant="amber" onClick={() => updateStatus(w.id || w._localId, 'PROSES')}>Proses</Btn>}
                {w.status === 'PROSES' && <Btn variant="success" onClick={() => updateStatus(w.id || w._localId, 'SELESAI')}>Selesai</Btn>}
                {w.status === 'SELESAI' && <Btn variant="blue" onClick={() => router.push(`/kasir?woId=${w.id || w._localId}`)}>Kasir</Btn>}
                {role === 'ADMIN' && <Btn variant="danger" onClick={() => deleteWO(w.id || w._localId)}>Hapus</Btn>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <Modal title="Work Order Baru" onClose={() => setShowModal(false)} wide
          footer={<><Btn onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="amber" onClick={saveWO} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan WO'}</Btn></>}>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>No. Plat *</label><input value={form.plat} onChange={e => setForm(f => ({...f, plat: e.target.value.toUpperCase()}))} placeholder="KB 1234 AB" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Jenis Kendaraan *</label>
              <select value={form.jenis} onChange={e => setForm(f => ({...f, jenis: e.target.value}))}>
                <option value="MOTOR">Motor</option><option value="MOBIL">Mobil</option><option value="ALAT_BERAT">Alat Berat</option>
              </select>
            </div>
          </div>
          <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Merk</label><input value={form.merk} onChange={e => setForm(f => ({...f, merk: e.target.value}))} placeholder="Honda" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Tipe</label><input value={form.tipe} onChange={e => setForm(f => ({...f, tipe: e.target.value}))} placeholder="Beat 2021" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Tahun</label><input type="number" value={form.tahun} onChange={e => setForm(f => ({...f, tahun: e.target.value}))} placeholder="2021" /></div>
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Nama Pemilik *</label><input value={form.pemilik} onChange={e => setForm(f => ({...f, pemilik: e.target.value}))} placeholder="Nama lengkap" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>No. HP</label><input value={form.hp} onChange={e => setForm(f => ({...f, hp: e.target.value}))} placeholder="08xxxxxxxxxx" /></div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Keluhan / Servis yang diminta *</label><textarea value={form.keluhan} onChange={e => setForm(f => ({...f, keluhan: e.target.value}))} rows={2} placeholder="Deskripsikan keluhan..." /></div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Catatan Tambahan</label><input value={form.catatan} onChange={e => setForm(f => ({...f, catatan: e.target.value}))} placeholder="Opsional" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Estimasi Biaya (Rp)</label><input type="number" value={form.estimasi} onChange={e => setForm(f => ({...f, estimasi: e.target.value}))} placeholder="0" /></div>
          </div>
          <div><label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Pilih Mekanik (bisa lebih dari satu)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mekaniks.filter(m => m.aktif).map(m => (
                <div key={m.id} onClick={() => toggleMek(m.id)} style={{ padding: '5px 10px', borderRadius: 20, background: form.mekanikIds.includes(m.id) ? 'rgba(245,158,11,0.15)' : 'var(--bg3)', border: `0.5px solid ${form.mekanikIds.includes(m.id) ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`, color: form.mekanikIds.includes(m.id) ? '#F59E0B' : 'var(--t2)', fontSize: 12, cursor: 'pointer' }}>
                  👷 {m.nama} <span style={{ fontSize: 10, opacity: 0.6 }}>({m.spesialis})</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showDetail && (
        <Modal title={showDetail.nomorWO} onClose={() => setShowDetail(null)} wide
          footer={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={() => setShowDetail(null)}>Tutup</Btn>
              {showDetail.status === 'ANTRI' && <Btn variant="amber" onClick={() => updateStatus(showDetail.id || showDetail._localId, 'PROSES')}>▶ Mulai Proses</Btn>}
              {showDetail.status === 'PROSES' && <Btn variant="success" onClick={() => updateStatus(showDetail.id || showDetail._localId, 'SELESAI')}>✓ Tandai Selesai</Btn>}
              {showDetail.status === 'SELESAI' && <Btn variant="blue" onClick={() => { setShowDetail(null); router.push(`/kasir?woId=${showDetail.id || showDetail._localId}`) }}>💰 Proses Kasir</Btn>}
            </div>
          }>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 3 }}>Kendaraan</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#F59E0B' }}>{showDetail.kendaraan?.plat}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{showDetail.kendaraan?.jenis} · {showDetail.kendaraan?.merk} {showDetail.kendaraan?.tipe}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 3 }}>Pemilik</div>
              <div style={{ fontSize: 13 }}>{showDetail.kendaraan?.pemilik}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{showDetail.kendaraan?.hp}</div>
            </div>
          </div>
          <div style={{ margin: '14px 0', padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4 }}>Keluhan</div>
            <div style={{ fontSize: 13 }}>{showDetail.keluhan}</div>
            {showDetail.catatan && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>📝 {showDetail.catatan}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>Mekanik yang ditugaskan</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {showDetail.mekaniks?.map((wm: any) => <span key={wm.id} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', borderRadius: 4 }}>👷 {wm.mekanik?.nama}</span>)}
                {!showDetail.mekaniks?.length && <span style={{ color: 'var(--t3)', fontSize: 12 }}>Belum ditugaskan</span>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 3 }}>Estimasi Biaya</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#F59E0B' }}>{rp(showDetail.estimasi || 0)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div><div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 3 }}>Masuk</div><div style={{ fontSize: 12 }}>{fmtDateTime(showDetail.waktuMasuk)}</div></div>
            <div><div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 3 }}>Selesai</div><div style={{ fontSize: 12 }}>{fmtDateTime(showDetail.waktuSelesai)}</div></div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
