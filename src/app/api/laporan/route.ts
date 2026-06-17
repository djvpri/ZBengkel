import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan') || new Date().toISOString().slice(0, 7)
  const [year, month] = bulan.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const [transaksi, woSelesai, stokKritis] = await Promise.all([
    prisma.transaksi.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { workOrder: { include: { kendaraan: true } }, items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workOrder.count({ where: { status: { in: ['SELESAI', 'BAYAR'] }, updatedAt: { gte: start, lte: end } } }),
    prisma.sparePart.findMany({ where: { stok: { lte: 5 } } }),
  ])

  const omzet = transaksi.reduce((a, b) => a + b.total, 0)
  const avg = transaksi.length ? omzet / transaksi.length : 0

  // Omzet per hari
  const harian: Record<string, number> = {}
  for (const t of transaksi) {
    const d = t.createdAt.toISOString().split('T')[0]
    harian[d] = (harian[d] || 0) + t.total
  }

  // Per jenis kendaraan
  const perJenis: Record<string, number> = { MOTOR: 0, MOBIL: 0, ALAT_BERAT: 0 }
  for (const t of transaksi) {
    const j = t.workOrder.kendaraan.jenis
    perJenis[j] = (perJenis[j] || 0) + t.total
  }

  // Top jasa
  const jasaCount: Record<string, number> = {}
  for (const t of transaksi) {
    for (const item of t.items) {
      jasaCount[item.nama] = (jasaCount[item.nama] || 0) + item.subtotal
    }
  }
  const topJasa = Object.entries(jasaCount).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([nama, total]) => ({ nama, total }))

  return NextResponse.json({ omzet, jumlahTrx: transaksi.length, avg, woSelesai, perJenis, harian, topJasa, stokKritis, transaksi })
}
