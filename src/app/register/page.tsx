'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ namaToko: '', slug: '', email: '', password: '', confirmPassword: '', nama: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const genSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.namaToko || !form.email || !form.password || !form.nama) {
      setError('Semua field wajib diisi')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Password tidak cocok')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaToko: form.namaToko,
          slug: form.slug || genSlug(form.namaToko),
          email: form.email,
          password: form.password,
          nama: form.nama,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftar')
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: '#1A2332', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#34D399', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Registrasi Berhasil!</h2>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Mengalihkan ke halaman login...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/landing" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>🔧 BENGKEL POS</div>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 6px' }}>Daftar Bengkel Baru</h1>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>Mulai kelola bengkel Anda secara gratis</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: '#111827', borderRadius: 14, padding: 28,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Nama Bengkel *</label>
            <input
              style={inputStyle}
              value={form.namaToko}
              onChange={e => {
                setForm({ ...form, namaToko: e.target.value, slug: genSlug(e.target.value) })
              }}
              placeholder="Bengkel Jaya"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Slug URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ padding: '10px 8px', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>pos.id/</span>
              <input
                style={{ ...inputStyle, borderRadius: '0 8px 8px 0' }}
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, '') })}
                placeholder="bengkel-jaya"
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Nama Pemilik *</label>
            <input
              style={inputStyle}
              value={form.nama}
              onChange={e => setForm({ ...form, nama: e.target.value })}
              placeholder="Nama Anda"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Email *</label>
            <input
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@bengkel.com"
            />
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Password *</label>
              <input
                style={inputStyle}
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 karakter"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Konfirmasi *</label>
              <input
                style={inputStyle}
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Ulangi password"
              />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', background: '#F59E0B', border: 'none', borderRadius: 8,
              color: '#0F1623', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Mendaftar...' : 'Daftar Gratis'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94A3B8' }}>
          Sudah punya akun? <Link href="/login" style={{ color: '#F59E0B', textDecoration: 'none' }}>Masuk</Link>
        </div>
      </div>
    </div>
  )
}
