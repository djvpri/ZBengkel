'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import { rp, fmtDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function LaporanPage() {
  const { status } = useSession()
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activePreset, setActivePreset] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchLaporan = async (f?: string, t?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f || from) params.set('from', f || from)
    if (t || to) params.set('to', t || to)
    const res = await fetch(`/api/laporan?${params}`, { credentials: 'include' })
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { if (status === 'authenticated') fetchLaporan() }, [status])

  const applyPreset = (preset: string) => {
    const now = new Date()
    let f = '', t = ''
    setActivePreset(preset)
    if (preset === 'today') {
      f = now.toISOString().split('T')[0]; t = f
    } else if (preset === '7') {
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
      f = d7.toISOString().split('T')[0]; t = now.toISOString().split('T')[0]
    } else if (preset === '30') {
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
      f = d30.toISOString().split('T')[0]; t = now.toISOString().split('T')[0]
    } else {
      setFrom(''); setTo(''); setActivePreset('all')
      fetchLaporan('', ''); return
    }
    setFrom(f); setTo(t)
    fetchLaporan(f, t)
  }

  // Calculate WO Selesai from transaction data
  const woSelesai = data?.transaksi?.length || 0

  // Daily breakdown
  const dailyData: Record<string, { jumlah: number; omzet: number }> = {}
  if (data?.transaksi) {
    data.transaksi.forEach((t: any) => {
      const day = new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      if (!dailyData[day]) dailyData[day] = { jumlah: 0, omzet: 0 }
      dailyData[day].jumlah++
      dailyData[day].omzet += t.total
    })
  }
  const dailyEntries = Object.entries(dailyData).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())

  const exportPDF = () => {
    if (!data) return
    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('LAPORAN BENGKEL POS', 20, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${from || 'Semua'} s/d ${to || 'Sekarang'}`, 20, 28)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 34)
    doc.setLineWidth(0.5)
    doc.line(20, 37, 190, 37)

    let y = 44
    // Summary
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan', 20, y); y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Omzet: ${rp(data?.summary?.totalOmzet || 0)}`, 24, y); y += 6
    doc.text(`Jumlah Transaksi: ${data?.summary?.jumlahTransaksi || 0}`, 24, y); y += 6
    doc.text(`Rata-rata/Transaksi: ${rp(data?.summary?.rataRata || 0)}`, 24, y); y += 12

    // Breakdown by jenis kendaraan
    if (data?.breakdown && Object.keys(data.breakdown).length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Breakdown per Jenis Kendaraan', 20, y); y += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      Object.entries(data.breakdown).forEach(([jenis, info]: [string, any]) => {
        doc.text(`${jenis}: ${info.jumlah} transaksi, ${rp(info.omzet)}`, 24, y); y += 6
      })
      y += 4
    }

    // Top Mekanik
    if (data?.topMekanik?.length) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Top Mekanik', 20, y); y += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      data.topMekanik.forEach((m: any) => {
        doc.text(`${m.nama}: ${m.jumlah} servis, ${rp(m.omzet)}`, 24, y); y += 6
      })
      y += 4
    }

    // Top Spare Part
    if (data?.topPart?.length) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Top Spare Part', 20, y); y += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      data.topPart.forEach((p: any) => {
        doc.text(`${p.nama}: ${p.qty} pcs, ${rp(p.omzet)}`, 24, y); y += 6
      })
      y += 6
    }

    // Daily breakdown table using autoTable
    if (dailyEntries.length > 0) {
      doc.addPage()
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Rincian Harian', 20, 20)

      const tableData = dailyEntries.map(([day, info]: [string, any]) => [
        day, String(info.jumlah), rp(info.omzet)
      ])

      autoTable(doc, {
        startY: 28,
        head: [['Tanggal', 'Jumlah Trx', 'Omzet']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 158, 11] },
      })

      // Transactions detail
      if (data?.transaksi?.length) {
        const y2 = (doc as any).lastAutoTable?.finalY || 28
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Detail Transaksi', 20, y2 + 10)

        const trxData = data.transaksi.map((t: any) => [
          t.nomorTrx,
          fmtDate(t.createdAt),
          t.workOrder?.kendaraan?.plat || '-',
          t.workOrder?.kendaraan?.pemilik || '-',
          rp(t.total),
          t.metode,
        ])

        autoTable(doc, {
          startY: y2 + 16,
          head: [['No. Trx', 'Tanggal', 'Plat', 'Pemilik', 'Total', 'Metode']],
          body: trxData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [245, 158, 11] },
        })
      }
    }

    doc.save(`laporan-bengkel-${from || 'all'}-${to || 'all'}.pdf`)
  }

  if (status === 'loading') return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 20, paddingTop: isMobile ? 52 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Laporan</h1>
        </div>

        {/* Date filter */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: isMobile ? 12 : 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { key: 'today', label: 'Hari Ini' },
              { key: '7', label: '7 Hari' },
              { key: '30', label: '30 Hari' },
              { key: 'all', label: 'Semua' },
            ].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none',
                background: activePreset === p.key ? '#F59E0B' : 'var(--bg3)',
                color: activePreset === p.key ? '#0F1623' : 'var(--t2)',
                fontWeight: activePreset === p.key ? 600 : 400,
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontSize: 12, maxWidth: 180 }} />
            <span style={{ color: 'var(--t3)', fontSize: 12 }}>s/d</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontSize: 12, maxWidth: 180 }} />
            <button onClick={() => { setActivePreset('custom'); fetchLaporan() }} style={{ padding: '6px 12px', background: 'var(--amber)', border: 'none', borderRadius: 6, color: '#0F1623', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? '...' : '🔍 Filter'}
            </button>
            <button onClick={exportPDF} style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
              📄 Export PDF
            </button>
          </div>
        </div>

        {!data ? <div style={{textAlign:'center',padding:24,color:'var(--t3)'}}>Memuat...</div> : (
          <>
            {/* Summary Cards */}
            <div className="mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { label: 'Total Omzet', value: rp(data?.summary?.totalOmzet || 0), icon: '💰', color: 'var(--amber)' },
                { label: 'Transaksi', value: data?.summary?.jumlahTransaksi || 0, icon: '📋', color: '#60A5FA' },
                { label: 'Rata-rata/Trx', value: rp(data?.summary?.rataRata || 0), icon: '📊', color: '#34D399' },
                { label: 'WO Selesai', value: woSelesai, icon: '✅', color: '#A78BFA' },
              ].map(c => (
                <div key={c.label} style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: isMobile ? 12 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>{c.label}</span>
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                <div className="mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 14 }}>
                  {Object.entries(data.breakdown).map(([jenis, info]: [string, any]) => (
                    <div key={jenis} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{jenis === 'MOTOR' ? '🏍️' : jenis === 'MOBIL' ? '🚗' : '🚜'} {jenis}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{info.jumlah} transaksi</div>
                      <div style={{ fontSize: 13, color: 'var(--amber)' }}>{rp(info.omzet)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Breakdown */}
            {dailyEntries.length > 0 && (
              <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>📅 Rincian Harian</div>

                {/* Desktop table */}
                <div className="hide-mobile">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Tanggal', 'Jumlah Transaksi', 'Omzet'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyEntries.map(([day, info]: [string, any]) => (
                        <tr key={day} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '8px 14px', fontSize: 12 }}>{day}</td>
                          <td style={{ padding: '8px 14px', fontSize: 12, color: 'var(--t2)' }}>{info.jumlah}</td>
                          <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--amber)' }}>{rp(info.omzet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="hide-desktop" style={{ padding: 10 }}>
                  {dailyEntries.map(([day, info]: [string, any]) => (
                    <div key={day} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{day}</span>
                        <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{rp(info.omzet)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{info.jumlah} transaksi</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
