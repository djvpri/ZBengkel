'use client'
import { useEffect } from 'react'

interface ToastProps { message: string; type?: 'success' | 'error'; onClose: () => void }

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--bg2)', border: `0.5px solid ${type === 'error' ? '#F87171' : '#34D399'}`, color: type === 'error' ? '#F87171' : '#34D399', padding: '10px 16px', borderRadius: 8, fontSize: 12, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  )
}
