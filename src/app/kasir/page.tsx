'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { rp } from '@/lib/utils'

interface KasirItem { key: string; tipe: 'JASA'|'PART'; jasaId?: string; sparePartId?: string; nama: string; qty: number; harga: number }

const Btn = ({ onClick, children, variant='default', disabled, style }: any) => {
  const s: any = {
    default: { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' },
    amber: { background: '#F59E0B', border: 'none', color: '#0F1623', fontWeight: 600 },
    danger: { background: 'transparent', border: '0.5px solid rgba(248,113,113,0.4)', color: '#F87171' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...s[variant], padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>{children}</button>
}

function KasirContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wos, setWOs] = useState<any[]>([])
  const [jasas, setJasas] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [selectedWO, setSelectedWO] = useState<any>(null)
  const [items, setItems] = useState<KasirItem[]>([])
  const [itemType, setItemType] = useState<'JASA'|'PART'>('JASA')
  const [selectedItem, setSelectedItem] = useState('')
  const [qty, setQty] = useState(1)
  const [diskon, setDiskon] = useState(0)
  const [metode, setMetode] = useState('TUNAI')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [struk, setStruk] = useState<any>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/wo?status=SELESAI').then(r => r.json()).then(d => setWOs(Array.isArray(d) ? d : []))
    fetch('/api/jasa').then(r => r.json()).then(d => setJasas(Array.isArray(d) ? d : []))
    fetch('/api/sparepart').then(r => r.json()).then(d => setParts(Array.isArray(d) ? d : []))
    const woId = searchParams.get('woId')
    if (woId) {
      fetch(`/api/wo/${woId}`).then(r => r.json()).then(w => { if (w.id) setSelectedWO(w) })
    }
  }, [status, searchParams])

  const subtotal = items.reduce((a, b) => a + b.qty * b.harga, 0)
  const total = subtotal * (1 - diskon / 100)

  const addItem = () => {
    if (!selectedItem) return
    if (itemType === 'JASA') {
      const j = jasas.find(x => x.id === selectedItem)
      if (!j) return
      const ex = items.find(i => i.key === 'j' + j.id)
      if (ex) setItems(items.map(i => i.key === 'j' + j.id ? { ...i, qty: i.qty + qty } : i))
      else setItems([...items, { key: 'j' + j.id, tipe: 'JASA', jasaId: j.id, nama: j.nama, qty, harga: j.harga }])
    } else {
      const p = parts.find(x => x.id === selectedItem)
      if (!p) return
      if (p.stok < qty) { setToast({ msg: `Stok ${p.nama} tidak cukup (${p.stok} ${p.satuan})`, type: 'error' }); return }
      const ex = items.find(i => i.key === 's' + p.id)
      if (ex) setItems(items.map(i => i.key === 's' + p.id ? { ...i, qty: i.qty + qty } : i))
      else setItems([...items, { key: 's' + p.id, tipe: 'PART', sparePartId: p.id, nama: p.nama, qty, harga: p.hargaJual }])
    }
    setQty(1)
  }

  const bayar = async () => {
    if (!selectedWO) { setToast({ msg: 'Pilih Work Order!', type: 'error' }); return }
    if (!items.length) { setToast({ msg: 'Tambah minimal 1 item!', type: 'error' }); return }
    setSaving(true)
    const res = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: selectedWO.id, items, diskon, metode, catatan }),
    })
    setSaving(false)
    if (res.ok) {
      const trx = await res.json()
      setStruk(trx)
      setItems([]); setDiskon(0); setSelectedWO(null)
      setToast({ msg: 'Pembayaran berhasil!', type: 'success' })
    } else {
      const e = await res.json()
      setToast({ msg: e.error || 'Gagal memproses', type: 'error' })
    }
  }

  const cetakStruk = useCallback(() => {
    if (!struk) return
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ format: [58, 210], unit: 'mm' })
      const w = 58; let y = 8
      const center = (txt: string, size = 8) => { doc.setFontSize(size); const tw = doc.getTextWidth(txt); doc.text(txt, (w - tw) / 2, y); y += size * 0.5 }
      const row = (l: string, r: string, size = 7) => { doc.setFontSize(size); doc.text(l, 3, y); doc.text(r, w - 3, y, { align: 'right' }); y += size * 0.45 }
      const line = () => { doc.setLineWidth(0.2); doc.line(3, y, w - 3, y); y += 3 }

      doc.setFont('courier', 'bold'); center('BENGKEL POS', 10); y += 2
      doc.setFont('courier', 'normal'); center(process.env.NEXT_PUBLIC_BENGKEL_NAMA || 'Jl. Contoh No.1', 7); y += 1
      center('Telp: ' + (process.env.NEXT_PUBLIC_BENGKEL_TELP || '0561-XXXXXX'), 7); y += 3
      line()
      row('No:', struk.nomorTrx); row('Plat:', struk.workOrder?.kendaraan?.plat || ''); row('Pemilik:', struk.workOrder?.kendaraan?.pemilik || '')
      y += 2; line()
      struk.items?.forEach((item: any) => { doc.setFontSize(7); doc.text(item.nama, 3, y); y += 4; row(`  ${item.qty}x ${rp(item.harga)}`, rp(item.subtotal)) })
      y += 1; line()
      row('Subtotal', rp(struk.subtotal))
      if (struk.diskon) row(`Diskon ${struk.diskon}%`, `-${rp(struk.subtotal * struk.diskon / 100)}`)
      y += 1; doc.setFont('courier', 'bold'); row('TOTAL', rp(struk.total), 9); y += 1
      doc.setFont('courier', 'normal'); row('Bayar', struk.metode)
      y += 3; line(); center('Terima kasih!', 8); y += 2; center('Garansi servis 7 hari', 7)

      doc.autoPrint(); doc.output('dataurlnewwindow')
    })
  }, [struk])

  if (status === 'loading') return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Kasir</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, height: 'calc(100vh - 100px)' }}>
          {/* Kiri */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--t2)' }}>📋 Pilih Work Order Selesai</div>
              <select value={selectedWO?.id || ''} onChange={e => {
                const w = wos.find(x => x.id === e.target.value)
                setSelectedWO(w || null); setItems([])
              }}>
                <option value="">-- Pilih WO --</option>
                {wos.map(w => <option key={w.id} value={w.id}>{w.nomorWO} — {w.kendaraan?.plat} ({w.kendaraan?.pemilik})</option>)}
              </select>
              {selectedWO && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>{selectedWO.nomorWO}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{selectedWO.kendaraan?.plat} · {selectedWO.kendaraan?.pemilik} · {selectedWO.kendaraan?.merk} {selectedWO.kendaraan?.tipe}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Keluhan: {selectedWO.keluhan}</div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 14, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--t2)' }}>📦 Tambah Item</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select style={{ width: 100 }} value={itemType} onChange={e => setItemType(e.target.value as any)}>
                  <option value="JASA">Jasa</option><option value="PART">Spare Part</option>
                </select>
                <select style={{ flex: 1 }} value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                  <option value="">-- Pilih --</option>
                  {itemType === 'JASA' ? jasas.map(j => <option key={j.id} value={j.id}>{j.nama} — {rp(j.harga)}</option>)
                  : parts.map(p => <option key={p.id} value={p.id}>{p.nama} (Stok:{p.stok} {p.satuan}) — {rp(p.hargaJual)}</option>)}
                </select>
                <input type="number" style={{ width: 60 }} value={qty} min={1} onChange={e => setQty(+e.target.value)} />
                <Btn variant="amber" onClick={addItem}>+ Tambah</Btn>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {items.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 20, fontSize: 12 }}>Belum ada item</div>
                : items.map((item, i) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ flex: 1, fontSize: 12 }}>{item.nama}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => setItems(items.map((x,j) => j===i ? {...x,qty:Math.max(1,x.qty-1)} : x))} style={{ width:22,height:22,background:'var(--bg3)',border:'0.5px solid rgba(255,255,255,0.1)',color:'var(--t1)',borderRadius:4,cursor:'pointer',fontSize:14 }}>−</button>
                      <span style={{ width:24,textAlign:'center',fontSize:12 }}>{item.qty}</span>
                      <button onClick={() => setItems(items.map((x,j) => j===i ? {...x,qty:x.qty+1} : x))} style={{ width:22,height:22,background:'var(--bg3)',border:'0.5px solid rgba(255,255,255,0.1)',color:'var(--t1)',borderRadius:4,cursor:'pointer',fontSize:14 }}>+</button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t2)', minWidth: 70, textAlign: 'right' }}>{rp(item.harga)}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{rp(item.qty * item.harga)}</div>
                    <button onClick={() => setItems(items.filter((_,j) => j!==i))} style={{ color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kanan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 14, color: 'var(--t2)' }}>🧾 Ringkasan Tagihan</div>
              <div style={{ flex: 1 }}></div>
              <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>
                  <span>Subtotal</span><span>{rp(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>
                  <span>Diskon</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" value={diskon} min={0} max={100} onChange={e => setDiskon(+e.target.value)} style={{ width: 60 }} />
                    <span style={{ fontSize: 11 }}>%</span>
                  </div>
                </div>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>{rp(total)}</span>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Metode Bayar</label>
                  <select value={metode} onChange={e => setMetode(e.target.value)}>
                    <option value="TUNAI">Tunai</option><option value="TRANSFER">Transfer Bank</option><option value="QRIS">QRIS</option><option value="DEBIT">Kartu Debit</option>
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Catatan</label>
                  <input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Opsional" />
                </div>
                <button onClick={bayar} disabled={saving} style={{ width: '100%', padding: '11px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#0F1623', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Memproses...' : '💳 Proses Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {struk && (
        <Modal title="Pembayaran Berhasil" onClose={() => setStruk(null)}
          footer={<><Btn onClick={() => setStruk(null)}>Tutup</Btn><Btn variant="amber" onClick={cetakStruk}>🖨 Cetak Struk</Btn></>}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#34D399', marginBottom: 4 }}>Pembayaran Berhasil!</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 2 }}>{struk.nomorTrx}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', marginTop: 10 }}>{rp(struk.total)}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{struk.metode}</div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default function KasirPage() {
  return <Suspense><KasirContent /></Suspense>
}
