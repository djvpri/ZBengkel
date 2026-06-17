const colors: Record<string, string> = {
  ANTRI: 'rgba(255,255,255,0.08)/rgba(255,255,255,0.4)',
  PROSES: 'rgba(245,158,11,0.15)/#F59E0B',
  SELESAI: 'rgba(52,211,153,0.12)/#34D399',
  BAYAR: 'rgba(96,165,250,0.12)/#60A5FA',
  MOTOR: 'rgba(96,165,250,0.12)/#60A5FA',
  MOBIL: 'rgba(52,211,153,0.12)/#34D399',
  ALAT_BERAT: 'rgba(245,158,11,0.12)/#F59E0B',
  ADMIN: 'rgba(167,139,250,0.15)/#A78BFA',
  KASIR: 'rgba(52,211,153,0.12)/#34D399',
  MEKANIK: 'rgba(245,158,11,0.12)/#F59E0B',
}

export default function Badge({ value, label }: { value: string; label?: string }) {
  const [bg, color] = (colors[value] || 'rgba(255,255,255,0.08)/rgba(255,255,255,0.4)').split('/')
  return (
    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: bg, color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {label || value}
    </span>
  )
}
