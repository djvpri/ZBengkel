'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { rp } from '@/lib/utils'
import jsPDF from 'jspdf'

export default function LaporanPage() {
  const { status } = useSession()
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchLaporan = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/laporan?${params}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { if (status === 'authenticated') fetchLaporan() }, [status])

  const exportPDF = () => {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Laporan Bengkel POS', 20, 20)
    doc.setFontSize(10)
    doc.text(`Periode: ${from || 'Semua'} s/d ${to || 'Sekarang'}`, 20, 28)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 34)

    let y = 45
    doc.setFontSize(12)
    doc.text('Ringkasan', 20, y); y += 8
    doc.setFontSize(10)
    doc.text(`Total Omzet: ${rp(data?.summary?.totalOmzet || 0)}`, 24, y); y += 6
    doc.text(`Jumlah Transaksi: ${data?.summary?.jumlahTransaksi || 0}`, 24, y); y += 6
    doc.text(`Rata-rata/Transaksi: ${rp(data?.summary?.rataRata || 0)}`, 24, y); y += 12

    if (data?.topMekanik?.length) {
      doc.setFontSize(12)
      doc.text('Top Mekanik', 20, y); y += 8
      doc.setFontSize(10)
      data.topMekanik.forEach((m: any) => {
        doc.text(`${m.nama}: ${m.jumlah} servis, ${rp(m.omzet)}`, 24, y); y += 6
      })
      y += 6
    }

    if (data?.topPart?.length) {
      doc.setFontSize(12)
      doc.text('Top Spare Part', 20, y); y += 8
      doc.setFontSize(10)
      data.topPart.forEach((p: any) => {
        doc.text(`${p.nama}: ${p.qty} pcs, ${rp(p.omzet)}`, 24, y); y += 6
      })
    }

    doc.save(`laporan-bengkel-${from || 'all'}.pdf`)
  }

  if (status === 'loading' || !data) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Laporan</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontSize: 12 }} />
            <span style={{ color: 'var(--t3)', fontSize: 12 }}>s/d</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontSize: 12 }} />
            <button onClick={fetchLaporan} style={{ padding: '6px 12px', background: 'var(--amber)', border: 'none', borderRadius: 6, color: '#0F1623', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? '...' : '🔍 Filter'}
            </button>
            <button onClick={exportPDF} style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Omzet', value: rp(data?.summary?.totalOmzet || 0), icon: '💰', color: 'var(--amber)' },
            { label: 'Transaksi', value: data?.summary?.jumlahTransaksi || 0, icon: '📋', color: '#60A5FA' },
            { label: 'Rata-rata', value: rp(data?.summary?.rataRata || 0), icon: '📊', color: '#34D399' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{c.label}</span>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Top Mekanik */}
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>👷 Top Mekanik</div>
            <div style={{ maxHeight: 250, overflow: 'auto' }}>
              {data?.topMekanik?.map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.nama}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{m.jumlah} servis</div>
                  </div>
                  <div style={{ color: 'var(--amber)', fontWeight: 600 }}>{rp(m.omzet)}</div>
                </div>
              ))}
              {!data?.topMekanik?.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Belum ada data</div>}
            </div>
          </div>

          {/* Top Spare Part */}
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>📦 Top Spare Part</div>
            <div style={{ maxHeight: 250, overflow: 'auto' }}>
              {data?.topPart?.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.nama}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{p.qty} pcs</div>
                  </div>
                  <div style={{ color: 'var(--amber)', fontWeight: 600 }}>{rp(p.omzet)}</div>
                </div>
              ))}
              {!data?.topPart?.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Belum ada data</div>}
            </div>
          </div>
        </div>

        {/* Breakdown by Kendaraan */}
        {data?.breakdown && Object.keys(data.breakdown).length > 0 && (
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>🚗 Breakdown per Jenis Kendaraan</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 14 }}>
              {Object.entries(data.breakdown).map(([jenis, info]: [string, any]) => (
                <div key={jenis} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{jenis}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{info.jumlah} transaksi</div>
                  <div style={{ fontSize: 13, color: 'var(--amber)' }}>{rp(info.omzet)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
