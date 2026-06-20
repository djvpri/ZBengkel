'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LoginMode = 'password' | 'face'

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [faceStatus, setFaceStatus] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const router = useRouter()

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/')
    else setError('Email atau password salah')
  }

  const handleFaceLogin = async () => {
    setLoading(true)
    setError('')
    setFaceStatus('Mengaktifkan kamera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }

      await new Promise(r => setTimeout(r, 1500))
      setFaceStatus('Mendeteksi wajah...')
      await new Promise(r => setTimeout(r, 1500))

      const video = videoRef.current!
      const canvas = canvasRef.current!
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)

      const blob = await new Promise<Blob>(r => {
        canvas.toBlob(b => r(b!), 'image/jpeg', 0.8)
      })

      stopCamera()
      setFaceStatus('Memverifikasi wajah...')

      // Proxy to ZFace
      const formData = new FormData()
      formData.append('file', blob, 'face.jpg')

      let zfaceData: any = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 30000)
          const res = await fetch('/api/auth/face-login', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.detail || errData.error || 'Wajah tidak terdaftar')
          }
          zfaceData = await res.json()
          break
        } catch (err: any) {
          if (attempt < 3) {
            setFaceStatus(`Mencoba ulang... (${attempt}/3)`)
            await new Promise(r => setTimeout(r, 1000))
            continue
          }
          throw err
        }
      }

      if (!zfaceData) throw new Error('Gagal menghubungi ZFace')

      setFaceStatus(`✓ ${zfaceData.person.name} — Login...`)

      // Verify
      const verifyRes = await fetch('/api/auth/face-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceToken: zfaceData.access_token }),
      })

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Verifikasi gagal')
      }

      const verifyData = await verifyRes.json()

      // Sign in
      const signInRes = await signIn('credentials', {
        email: verifyData.email,
        password: `face:${verifyData.name}`,
        redirect: false,
      })

      if (signInRes?.ok) router.push('/')
      else throw new Error('Login gagal setelah verifikasi')
    } catch (err: any) {
      setError(err.message || 'Face login gagal')
      setFaceStatus('')
      stopCamera()
    } finally {
      setLoading(false)
    }
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

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 8, background: 'var(--bg0)', padding: 4, marginBottom: 16 }}>
          <button onClick={() => { setMode('password'); stopCamera(); setFaceStatus(''); setError('') }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: mode === 'password' ? 'var(--bg2)' : 'transparent', color: mode === 'password' ? '#fff' : 'var(--t3)' }}>
            🔑 Password
          </button>
          <button onClick={() => { setMode('face'); setError(''); setFaceStatus('') }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: mode === 'face' ? 'var(--bg2)' : 'transparent', color: mode === 'face' ? '#fff' : 'var(--t3)' }}>
            📷 Wajah
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 12, borderRadius: 8, padding: '8px 12px', fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '0.5px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {mode === 'password' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bengkel.com" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: 'var(--amber)', color: '#000', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg0)', borderRadius: 8, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!cameraActive && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>Klik tombol di bawah</div>
                  </div>
                </div>
              )}
              {faceStatus && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: 6, textAlign: 'center' }}>
                  {faceStatus}
                </div>
              )}
            </div>
            <button onClick={handleFaceLogin} disabled={loading}
              style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: 'var(--amber)', color: '#000', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Memproses...' : '📷 Login dengan Wajah'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--t3)' }}>
          Belum punya akun? <Link href="/register" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Daftar</Link>
        </div>
      </div>
    </div>
  )
}
