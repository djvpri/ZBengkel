'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { rp, fmtDateTime } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lap, setLap] = useState<any>(null)
  const [wo, setWO] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/laporan').then(r => r.json()).then(setLap)
    fetch('/api/wo?limit=5').then(r => r.json()).then(d => setWO(Array.isArray(d) ? d.slice(0, 5) : []))
  }, [status])

  if (status === 'loading' || !session) return null

  const harianData = lap ? Object.entries(lap.harian || {}).map(([date, val]) => ({ date: date.slice(5), val })) : []
  const jenisData = lap ? [
    { name: 'Motor', value: lap.perJenis?.MOTOR || 0, color: '#60A5FA' },
    { name: 'Mobil', value: lap.perJenis?.MOBIL || 0, color: '#34D399' },
    { name: 'Alat Berat', value: lap.perJenis?.ALAT_BERAT || 0, color: '#F59E0B' },
  ] : []

  const stats = [
    { label: 'Omzet Bulan Ini', val: lap ? rp(lap.omzet) : '—', color: '#F59E0B', icon: '💰' },
    { label: 'Total Transaksi', val: lap?.jumlahTrx ?? '—', color: 'rgba(255,255,255,0.85)', icon: '🧾' },
    { label: 'WO Selesai', val: lap?.woSelesai ?? '—', color: '#34D399', icon: '✅' },
    { label: 'Stok Kritis', val: lap?.stokKritis?.length ?? '—', color: '#F87171', icon: '⚠️' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Selamat datang, {session.user?.name}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 14px', border: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Chart harian */}
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: 'var(--t2)' }}>📈 Omzet Harian (Bulan Ini)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={harianData}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip formatter={(v: any) => rp(v)} contentStyle={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="val" fill="#F59E0B" radius={[3, 3, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: 'var(--t2)' }}>🥧 Omzet per Jenis Kendaraan</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={jenisData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {jenisData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.8} />)}
                </Pie>
                <Tooltip formatter={(v: any) => rp(v)} contentStyle={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
              {jenisData.map(j => <div key={j.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--t2)' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: j.color }}></div>{j.name}</div>)}
            </div>
          </div>
        </div>

        {/* Recent WO */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>📋 Work Order Terbaru</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['No. WO','Plat','Pemilik','Keluhan','Status','Masuk'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {wo.map((w: any) => (
                <tr key={w.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#F59E0B' }}>{w.nomorWO}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500 }}>{w.kendaraan?.plat}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>{w.kendaraan?.pemilik}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--t2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.keluhan}</td>
                  <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: w.status === 'PROSES' ? 'rgba(245,158,11,0.15)' : w.status === 'SELESAI' ? 'rgba(52,211,153,0.12)' : w.status === 'BAYAR' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.08)', color: w.status === 'PROSES' ? '#F59E0B' : w.status === 'SELESAI' ? '#34D399' : w.status === 'BAYAR' ? '#60A5FA' : 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{w.status}</span></td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--t3)' }}>{fmtDateTime(w.waktuMasuk)}</td>
                </tr>
              ))}
              {!wo.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>Belum ada work order</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
