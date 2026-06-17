import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateNomorTrx, kirimWA } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const where: any = {}
  if (search) where.OR = [
    { workOrder: { kendaraan: { plat: { contains: search, mode: 'insensitive' } } } },
    { workOrder: { kendaraan: { pemilik: { contains: search, mode: 'insensitive' } } } },
  ]
  const data = await prisma.transaksi.findMany({
    where,
    include: { workOrder: { include: { kendaraan: true, mekaniks: { include: { mekanik: true } } } }, items: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { workOrderId, items, diskon, metode, catatan } = body
  if (!workOrderId || !items?.length) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

  const subtotal = items.reduce((a: number, b: any) => a + b.qty * b.harga, 0)
  const disc = +diskon || 0
  const total = subtotal * (1 - disc / 100)
  const count = await prisma.transaksi.count()
  const nomorTrx = generateNomorTrx(count + 1)

  const trx = await prisma.$transaction(async (tx) => {
    // Kurangi stok spare part
    for (const item of items) {
      if (item.tipe === 'PART' && item.sparePartId) {
        const sp = await tx.sparePart.findUnique({ where: { id: item.sparePartId } })
        if (!sp || sp.stok < item.qty) throw new Error(`Stok ${item.nama} tidak cukup`)
        await tx.sparePart.update({ where: { id: item.sparePartId }, data: { stok: { decrement: item.qty } } })
      }
    }
    // Update mekanik totalSelesai
    const wo = await tx.workOrder.findUnique({ where: { id: workOrderId }, include: { mekaniks: true } })
    for (const wm of (wo?.mekaniks || [])) {
      await tx.mekanik.update({ where: { id: wm.mekanikId }, data: { totalSelesai: { increment: 1 } } })
    }
    // Update WO status
    await tx.workOrder.update({ where: { id: workOrderId }, data: { status: 'BAYAR' } })
    // Create transaksi
    return tx.transaksi.create({
      data: {
        nomorTrx, workOrderId, subtotal, diskon: disc, total,
        metode, catatan,
        items: { create: items.map((i: any) => ({ tipe: i.tipe, jasaId: i.jasaId || null, sparePartId: i.sparePartId || null, nama: i.nama, qty: i.qty, harga: i.harga, subtotal: i.qty * i.harga })) },
      },
      include: { workOrder: { include: { kendaraan: true, mekaniks: { include: { mekanik: true } } } }, items: true },
    })
  })

  // Cek stok kritis & kirim WA
  const kritisItems = await prisma.sparePart.findMany({ where: { stok: { lte: prisma.sparePart.fields.minStok } } } as any).catch(() => [])
  const waAdmin = process.env.WA_ADMIN_NUMBER
  if (waAdmin && Array.isArray(kritisItems) && kritisItems.length > 0) {
    const pesanWA = `⚠️ *Stok Kritis Bengkel POS*\n\n${kritisItems.map((s: any) => `• ${s.nama}: ${s.stok} ${s.satuan} (min. ${s.minStok})`).join('\n')}\n\nSegera lakukan pembelian!`
    await kirimWA(waAdmin, pesanWA)
    await prisma.notifikasiLog.create({ data: { tipe: 'STOK_KRITIS', pesan: pesanWA, status: 'SENT' } })
  }

  return NextResponse.json(trx)
}
