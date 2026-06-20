'use client'

import { useRef } from 'react'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

interface CetakNotaProps {
  transaksi: any
  tenant: any
  onClose: () => void
}

export default function CetakNota({ transaksi, tenant, onClose }: CetakNotaProps) {
  const notaRef = useRef<HTMLDivElement>(null)

  const fmt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
  const tgl = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleCetak = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return

    const items = transaksi.items || []
    const lines = [
      '══════════════════════════',
      `    ${(tenant?.namaToko || 'BENGKEL POS').toUpperCase()}`,
      `    ${tenant?.alamat || ''}`,
      `    Telp: ${tenant?.telepon || '-'}`,
      '══════════════════════════',
      '',
      `No: ${transaksi.nomorTrx}`,
      `Tanggal: ${tgl(transaksi.createdAt)}`,
      `Mekanik: ${transaksi.workOrder?.mekaniks?.[0]?.mekanik?.nama || '-'}`,
      `Kendaraan: ${transaksi.workOrder?.kendaraan?.plat || '-'} (${transaksi.workOrder?.kendaraan?.jenis || '-'})`,
      '──────────────────────────',
    ]

    items.forEach((item: any) => {
      lines.push(`${item.nama}`)
      lines.push(`  ${item.qty}x ${fmt(item.harga)} = ${fmt(item.subtotal)}`)
    })

    lines.push('──────────────────────────')
    lines.push(`Subtotal: ${fmt(transaksi.subtotal)}`)
    if (transaksi.diskon > 0) lines.push(`Diskon: ${fmt(transaksi.subtotal * transaksi.diskon / 100)}`)
    lines.push(`TOTAL: ${fmt(transaksi.total)}`)
    lines.push(`Bayar: ${transaksi.metode}`)
    lines.push('──────────────────────────')
    lines.push('')
    lines.push('Terima kasih atas kunjungan')
    lines.push('Garansi servis 7 hari')
    lines.push('')
    lines.push('══════════════════════════')

    printWindow.document.write(`
      <html><head><title>Struk - ${transaksi.nomorTrx}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 300px; margin: 0 auto; }
        pre { white-space: pre-wrap; margin: 0; }
        @media print { body { padding: 0; } }
      </style></head>
      <body><pre>${lines.join('\n')}</pre></body></html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  const items = transaksi?.items || []

  return (
    <Modal title="Cetak Nota" onClose={onClose} footer={
      <>
        <Button onClick={onClose}>Tutup</Button>
        <Button variant="amber" onClick={handleCetak}>🖨 Cetak Nota</Button>
      </>
    }>
      <div ref={notaRef} style={{
        background: '#1A2332', borderRadius: 8, padding: 20,
        fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.6,
        border: '1px dashed rgba(255,255,255,0.15)',
        whiteSpace: 'pre-wrap',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{(tenant?.namaToko || 'BENGKEL POS').toUpperCase()}</div>
          <div style={{ color: 'var(--t3)', fontSize: 11 }}>{tenant?.alamat || ''}</div>
          <div style={{ color: 'var(--t3)', fontSize: 11 }}>Telp: {tenant?.telepon || '-'}</div>
        </div>
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '8px 0' }} />
        <div style={{ fontSize: 11, color: 'var(--t2)' }}>
          <div>No: {transaksi?.nomorTrx}</div>
          <div>Tanggal: {tgl(transaksi?.createdAt)}</div>
          <div>Mekanik: {transaksi?.workOrder?.mekaniks?.[0]?.mekanik?.nama || '-'}</div>
          <div>Kendaraan: {transaksi?.workOrder?.kendaraan?.plat} ({transaksi?.workOrder?.kendaraan?.jenis})</div>
        </div>
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '8px 0' }} />
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
            <span>{item.qty}x {item.nama}</span>
            <span>{fmt(item.subtotal)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '8px 0' }} />
        <div style={{ fontSize: 11, color: 'var(--t2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmt(transaksi?.subtotal)}</span></div>
          {transaksi?.diskon > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Diskon {transaksi.diskon}%</span><span>-{fmt(transaksi.subtotal * transaksi.diskon / 100)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#F59E0B', marginTop: 4 }}><span>TOTAL</span><span>{fmt(transaksi?.total)}</span></div>
          <div style={{ marginTop: 4, color: 'var(--t3)' }}>Bayar: {transaksi?.metode}</div>
        </div>
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '8px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--t3)' }}>
          <div>Terima kasih atas kunjungan</div>
          <div>Garansi servis 7 hari</div>
        </div>
      </div>
    </Modal>
  )
}
