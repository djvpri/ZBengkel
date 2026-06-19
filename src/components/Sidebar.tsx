'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuAdmin: { href: string; label: string; icon: string; adminOnly?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/wo', label: 'Work Order', icon: '📋' },
  { href: '/kasir', label: 'Kasir', icon: '💰' },
  { href: '/sparepart', label: 'Spare Part', icon: '📦' },
  { href: '/jasa', label: 'Daftar Jasa', icon: '🔧' },
  { href: '/mekanik', label: 'Mekanik', icon: '👷' },
  { href: '/kendaraan', label: 'Kendaraan', icon: '🚗' },
  { href: '/laporan', label: 'Laporan', icon: '📊' },
  { href: '/riwayat', label: 'Riwayat Servis', icon: '📜' },
  { href: '/users', label: 'Kelola User', icon: '👥', adminOnly: true },
]

const menuKasir = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/wo', label: 'Work Order', icon: '📋' },
  { href: '/kasir', label: 'Kasir', icon: '💰' },
  { href: '/riwayat', label: 'Riwayat', icon: '📜' },
]

const menuMekanik = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/wo', label: 'Work Order Saya', icon: '📋' },
]

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = (session?.user as any)?.role
  const menu = role === 'ADMIN' ? menuAdmin : role === 'KASIR' ? menuKasir : menuMekanik
  const initials = session?.user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'

  return (
    <aside style={{ width: 210, background: 'var(--bg1)', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100vh' }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>🔧 BENGKEL POS</div>
        <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Manajemen Bengkel Profesional</div>
      </div>
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {menu.filter(m => !m.adminOnly || role === 'ADMIN').map(m => (
          <Link key={m.href} href={m.href} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px',
            fontSize: 12, color: pathname === m.href ? 'var(--amber)' : 'var(--t2)',
            background: pathname === m.href ? 'rgba(245,158,11,0.1)' : 'transparent',
            borderLeft: pathname === m.href ? '2px solid var(--amber)' : '2px solid transparent',
            textDecoration: 'none', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 14 }}>{m.icon}</span>{m.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '12px 14px', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--amber)', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t1)', fontWeight: 500 }}>{session?.user?.name}</div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>{role}</div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '6px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
          Keluar
        </button>
      </div>
    </aside>
  )
}
