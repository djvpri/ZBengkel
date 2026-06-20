'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { rp } from '@/lib/utils'

const Card = ({ label, value, icon, color = 'var(--amber)', sub }: any) => (
  <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 16 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--t3)' }}>{sub}</div>}
  </div>
)

const LimitBar = ({ label, current, max, color = 'var(--amber)' }: any) => {
  const pct = max === -1 ? 0 : Math.min((current / max) * 100, 100)
  const isUnlimited = max === -1
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--t2)' }}>{label}</span>
        <span style={{ color: 'var(--t3)' }}>{isUnlimited ? 'Unlimited' : `${current}/${max}`}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: isUnlimited ? '100%' : `${pct}%`, background: pct > 80 ? '#F87171' : color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { status, data } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [tenantInfo, setTenantInfo] = useState<any>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/wo').then(r => r.json()).then(d => setStats(Array.isArray(d) ? d : []))
    fetch('/api/tenant').then(r => r.json()).then(d => setTenantInfo(d)).catch(() => {})
  }, [status])

  if (status === 'loading') return null

  const woList = Array.isArray(stats) ? stats : []
  const antri = woList.filter((w: any) => w.status === 'ANTRI').length
  const proses = woList.filter((w: any) => w.status === 'PROSES').length
  const selesai = woList.filter((w: any) => w.status === 'SELESAI').length

  const role = (data?.user as any)?.role
  const planName = tenantInfo?.plan?.nama || 'Free'
  const limits = tenantInfo?.limits

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600 }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{(data?.user as any)?.tenantNama || 'Bengkel POS'}</p>
          </div>
          {limits && limits.workOrder?.planName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', fontSize: 11, fontWeight: 600 }}>
                Plan: {limits.workOrder.planName}
              </span>
              {limits.workOrder.planName === 'Free' && (
                <a href="/landing" style={{ padding: '4px 10px', borderRadius: 6, background: '#F59E0B', color: '#0F1623', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  Upgrade
                </a>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Card label="Work Order" value={woList.length} icon="📋" sub={`${antri} antri, ${proses} proses`} />
          <Card label="Antri" value={antri} icon="⏳" color="#FB923C" />
          <Card label="Proses" value={proses} icon="🔧" color="#60A5FA" />
          <Card label="Selesai" value={selesai} icon="✅" color="#34D399" />
        </div>

        {/* Plan Usage */}
        {limits && role === 'ADMIN' && (
          <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: 'var(--t2)' }}>📊 Penggunaan Plan</div>
            <LimitBar label="Work Order" current={limits.workOrder?.current || 0} max={limits.workOrder?.max || -1} />
            <LimitBar label="Spare Part" current={limits.sparePart?.current || 0} max={limits.sparePart?.max || -1} />
            <LimitBar label="Mekanik" current={limits.mekanik?.current || 0} max={limits.mekanik?.max || -1} />
          </div>
        )}

        {/* Recent WO */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500, color: 'var(--t2)' }}>
            Work Order Terbaru
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['No. WO', 'Plat', 'Pemilik', 'Keluhan', 'Status', 'Waktu'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {woList.slice(0, 8).map((wo: any) => (
                <tr key={wo.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: '#F59E0B', fontWeight: 500 }}>{wo.nomorWO}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500 }}>{wo.kendaraan?.plat}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{wo.kendaraan?.pemilik}</td>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--t2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.keluhan}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: wo.status === 'ANTRI' ? 'rgba(251,146,60,0.15)' : wo.status === 'PROSES' ? 'rgba(96,165,250,0.15)' : wo.status === 'SELESAI' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)', color: wo.status === 'ANTRI' ? '#FB923C' : wo.status === 'PROSES' ? '#60A5FA' : wo.status === 'SELESAI' ? '#34D399' : 'var(--t3)' }}>
                      {wo.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--t3)' }}>{new Date(wo.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {!woList.length && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--t3)' }}>Belum ada work order</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
