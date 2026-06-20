'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/')
    else setError('Email atau password salah')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg1)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 'clamp(20px, 5vw, 36px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/landing" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔧</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--amber)' }}>BENGKEL POS</div>
          </Link>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Sistem Manajemen Bengkel Profesional</div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bengkel.com" required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 14, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 6 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: 'var(--amber)', border: 'none', borderRadius: 8, color: '#0F1623', fontWeight: 600, fontSize: 13, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>
          Belum punya akun? <Link href="/register" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Daftar Gratis</Link>
        </div>
        <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11, color: 'var(--t3)' }}>
          <div style={{ fontWeight: 500, marginBottom: 6, color: 'var(--t2)' }}>Akun Demo:</div>
          <div>Admin: admin@bengkel.com / admin123</div>
          <div>Kasir: kasir@bengkel.com / kasir123</div>
          <div>Mekanik: mekanik@bengkel.com / mekanik123</div>
        </div>
      </div>
    </div>
  )
}
