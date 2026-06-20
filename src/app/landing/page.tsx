'use client'

import Link from 'next/link'

const features = [
  { icon: '📋', name: 'Work Order', desc: 'Kelola antrean servis kendaraan dari masuk hingga selesai' },
  { icon: '💰', name: 'Kasir', desc: 'Proses pembayaran tunai, transfer, QRIS dengan struk otomatis' },
  { icon: '📦', name: 'Spare Part', desc: 'Kelola stok barang, harga beli & jual, low stock alert' },
  { icon: '🔧', name: 'Mekanik', desc: 'Daftar mekanik, spesialisasi, dan tracking penyelesaian' },
  { icon: '📊', name: 'Laporan', desc: 'Laporan omzet, transaksi, breakdown per jenis kendaraan' },
  { icon: '📜', name: 'Riwayat Servis', desc: 'Histori lengkap semua servis dengan cetak struk ulang' },
  { icon: '👥', name: 'Multi User', desc: 'Admin, Kasir, Mekanik dengan hak akses berbeda' },
  { icon: '☁️', name: 'Cloud Based', desc: 'Akses dari mana saja, data tersimpan aman di cloud' },
]

const plans = [
  {
    name: 'Free', price: 'Gratis', period: '/bulan',
    maxWO: '20', maxPart: '50', maxMekanik: '2',
    features: ['Work Order & Kasir', 'Spare Part (50 item)', '2 Mekanik', 'Laporan Dasar', 'Struk Digital'],
    highlight: false,
  },
  {
    name: 'Basic', price: 'Rp 149.000', period: '/bulan',
    maxWO: '200', maxPart: '500', maxMekanik: '5',
    features: ['Semua Fitur Free', '200 Work Order/bulan', '500 Spare Part', '5 Mekanik', 'Laporan Detail', 'Cetak PDF', '1 User Kasir'],
    highlight: false,
  },
  {
    name: 'Pro', price: 'Rp 349.000', period: '/bulan',
    maxWO: '1.000', maxPart: 'Unlimited', maxMekanik: 'Unlimited',
    features: ['Semua Fitur Basic', '1.000 Work Order/bulan', 'Spare Part Unlimited', 'Mekanik Unlimited', 'Multi User', 'Laporan Premium', 'Cetak Nota Custom', 'Prioritas Support'],
    highlight: true,
  },
  {
    name: 'Enterprise', price: 'Rp 699.000', period: '/bulan',
    maxWO: 'Unlimited', maxPart: 'Unlimited', maxMekanik: 'Unlimited',
    features: ['Semua Fitur Pro', 'Work Order Unlimited', 'Semua Unlimited', 'White Label', 'API Access', 'Dedicated Support', 'Custom Integrasi', 'SLA 99.9%'],
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', color: '#E2E8F0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔧</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>BENGKEL POS</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#94A3B8', fontSize: 13, textDecoration: 'none' }}>Masuk</Link>
          <Link href="/register" style={{ background: '#F59E0B', color: '#0F1623', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 12, fontWeight: 500, marginBottom: 20 }}>
          🚀 Sistem POS Bengkel #1 di Indonesia
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px' }}>
          Kelola Bengkel Lebih <span style={{ color: '#F59E0B' }}>Mudah</span> & <span style={{ color: '#34D399' }}>Profesional</span>
        </h1>
        <p style={{ fontSize: 16, color: '#94A3B8', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 32px' }}>
          Sistem manajemen bengkel all-in-one: Work Order, Kasir, Spare Part, Mekanik, dan Laporan. Mulai dari Rp 0/bulan.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ background: '#F59E0B', color: '#0F1623', padding: '12px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Mulai Gratis →
          </Link>
          <Link href="/login" style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '12px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500, color: '#94A3B8', textDecoration: 'none' }}>
            Demo Login
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '40px 24px', flexWrap: 'wrap' }}>
        {[['500+', 'Bengkel Aktif'], ['50K+', 'Work Order'], ['Rp 50M+', 'Omzet Diproses'], ['99.9%', 'Uptime']].map(([num, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{num}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>Fitur Lengkap</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.name}</div>
              <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Harga Terjangkau</h2>
        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 14, marginBottom: 40 }}>Mulai gratis, upgrade sesuai kebutuhan</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, alignItems: 'start' }}>
          {plans.map(p => (
            <div key={p.name} style={{
              background: p.highlight ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: p.highlight ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: 28, position: 'relative',
            }}>
              {p.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#F59E0B', color: '#0F1623', padding: '4px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>POPULER</div>}
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{p.price}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{p.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#CBD5E1' }}>
                    <span style={{ color: '#34D399' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <Link href="/register" style={{
                display: 'block', textAlign: 'center', padding: '10px',
                background: p.highlight ? '#F59E0B' : 'transparent',
                border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: p.highlight ? '#0F1623' : '#94A3B8',
                textDecoration: 'none',
              }}>
                {p.price === 'Gratis' ? 'Mulai Gratis' : 'Pilih Plan'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px 80px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Siap Mengelola Bengkel?</h2>
        <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 28 }}>Daftar gratis dalam 30 detik, tidak perlu kartu kredit</p>
        <Link href="/register" style={{ background: '#F59E0B', color: '#0F1623', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Daftar Sekarang →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#475569' }}>
        © 2026 Bengkel POS — Sistem Manajemen Bengkel Modern
      </footer>
    </div>
  )
}
