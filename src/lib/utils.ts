export const rp = (n: number) =>
  'Rp ' + Math.round(n).toLocaleString('id-ID')

export const fmtDate = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fmtDateTime = (d: string | Date | null) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export const generateNomorWO = (n: number) =>
  `WO-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

export const generateNomorTrx = (n: number) =>
  `TRX-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

export async function kirimWA(nomor: string, pesan: string) {
  const token = process.env.FONNTE_TOKEN
  if (!token) return { ok: false, msg: 'FONNTE_TOKEN not set' }
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: new URLSearchParams({ target: nomor, message: pesan }),
    })
    return { ok: res.ok }
  } catch (e) {
    return { ok: false, msg: String(e) }
  }
}
