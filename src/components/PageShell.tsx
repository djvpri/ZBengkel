'use client'
import { useState, useEffect } from 'react'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'

export default function PageShell({ children, rightSlot }: { children: React.ReactNode; rightSlot?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{
        flex: 1, overflow: 'auto', padding: isMobile ? 12 : 20,
        paddingTop: isMobile ? 52 : 20,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {children}
      </main>
    </div>
  )
}
