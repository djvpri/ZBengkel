'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

function SsoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Token tidak ditemukan. Buka ZBengkel lewat Z One lagi.'); return }
    signIn('credentials', { ssoToken: token, email: '', password: '', redirect: false })
      .then(res => {
        if (res?.ok) {
          window.location.replace('https://zbengkel.zomet.my.id/dashboard')
        } else {
          setStatus('error')
          setMsg('Login SSO gagal. Pastikan akun terdaftar di ZBengkel.')
        }
      })
      .catch(() => { setStatus('error'); setMsg('Tidak dapat terhubung ke server ZBengkel') })
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="text-center max-w-sm">
        {status === 'loading' ? (
          <>
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Menghubungkan akun dari Z One...</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-400 font-medium mb-2">Gagal Login</p>
            <p className="text-gray-500 text-sm mb-4">{msg}</p>
            <a href="https://zone.zomet.my.id" className="text-blue-400 text-sm underline">Kembali ke Z One</a>
          </>
        )}
      </div>
    </div>
  )
}

export default function SsoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SsoContent />
    </Suspense>
  )
}
