import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'amber' | 'danger'
}

export default function Button({ children, variant = 'default', style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: 'none',
  }

  const variants: Record<string, React.CSSProperties> = {
    default: { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' },
    amber: { background: '#F59E0B', color: '#0F1623', fontWeight: 600 },
    danger: { background: 'transparent', border: '0.5px solid rgba(248,113,113,0.4)', color: '#F87171' },
  }

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  )
}
