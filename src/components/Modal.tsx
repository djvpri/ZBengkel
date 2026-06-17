'use client'
export default function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg1)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.12)', width: '100%', maxWidth: wide ? 720 : 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  )
}
