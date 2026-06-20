import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to + 'T23:59:59')

  const where: any = { tenantId }
  if (from || to) where.createdAt = dateFilter

  // Total transaksi
  const transaksi = await prisma.transaksi.findMany({
    where,
    include: {
      workOrder: { include: { kendaraan: true, mekaniks: { include: { mekanik: true } } } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalOmzet = transaksi.reduce((sum, t) => sum + t.total, 0)
  const jumlahTransaksi = transaksi.length
  const rataRata = jumlahTransaksi > 0 ? totalOmzet / jumlahTransaksi : 0

  // Breakdown by jenis kendaraan
  const breakdown: Record<string, { jumlah: number; omzet: number }> = {}
  for (const t of transaksi) {
    const jenis = t.workOrder?.kendaraan?.jenis || 'LAINNYA'
    if (!breakdown[jenis]) breakdown[jenis] = { jumlah: 0, omzet: 0 }
    breakdown[jenis].jumlah++
    breakdown[jenis].omzet += t.total
  }

  // Top mekanik
  const mekanikCount: Record<string, { nama: string; jumlah: number; omzet: number }> = {}
  for (const t of transaksi) {
    for (const wm of t.workOrder?.mekaniks || []) {
      const id = wm.mekanikId
      if (!mekanikCount[id]) mekanikCount[id] = { nama: wm.mekanik?.nama || '-', jumlah: 0, omzet: 0 }
      mekanikCount[id].jumlah++
      mekanikCount[id].omzet += t.total
    }
  }

  // Top spare part
  const partCount: Record<string, { nama: string; qty: number; omzet: number }> = {}
  for (const t of transaksi) {
    for (const item of t.items) {
      if (item.tipe === 'PART') {
        const id = item.sparePartId || item.nama
        if (!partCount[id]) partCount[id] = { nama: item.nama, qty: 0, omzet: 0 }
        partCount[id].qty += item.qty
        partCount[id].omzet += item.subtotal
      }
    }
  }

  return NextResponse.json({
    summary: {
      totalOmzet,
      jumlahTransaksi,
      rataRata,
      from: from || null,
      to: to || null,
    },
    breakdown,
    topMekanik: Object.values(mekanikCount).sort((a, b) => b.jumlah - a.jumlah).slice(0, 10),
    topPart: Object.values(partCount).sort((a, b) => b.qty - a.qty).slice(0, 10),
    transaksi,
  })
}
