import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function genNomorTrx() {
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TRX-${y}${m}${day}-${rand}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = { tenantId }
  if (search) {
    where.OR = [
      { nomorTrx: { contains: search, mode: 'insensitive' } },
      { workOrder: { nomorWO: { contains: search, mode: 'insensitive' } } },
      { workOrder: { kendaraan: { plat: { contains: search, mode: 'insensitive' } } } },
      { workOrder: { kendaraan: { pemilik: { contains: search, mode: 'insensitive' } } } },
    ]
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59')
  }

  const trxs = await prisma.transaksi.findMany({
    where,
    include: {
      workOrder: { include: { kendaraan: true, mekaniks: { include: { mekanik: true } } } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(trxs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { workOrderId, items, diskon, metode, catatan } = body

  if (!workOrderId || !items?.length) {
    return NextResponse.json({ error: 'WO dan item wajib diisi' }, { status: 400 })
  }

  // Verify WO belongs to this tenant
  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, tenantId } })
  if (!wo) return NextResponse.json({ error: 'Work Order tidak ditemukan' }, { status: 404 })
  if (wo.status === 'BAYAR') return NextResponse.json({ error: 'WO sudah dibayar' }, { status: 400 })

  const subtotal = items.reduce((sum: number, item: any) => sum + item.qty * item.harga, 0)
  const diskonPersen = diskon || 0
  const total = subtotal - (subtotal * diskonPersen / 100)

  const transaksi = await prisma.$transaction(async (tx) => {
    // Reduce stock for parts
    for (const item of items) {
      if (item.tipe === 'PART' && item.sparePartId) {
        const part = await tx.sparePart.findUnique({ where: { id: item.sparePartId } })
        if (part && part.stok < item.qty) {
          throw new Error(`Stok ${part.nama} tidak cukup`)
        }
        await tx.sparePart.update({
          where: { id: item.sparePartId },
          data: { stok: { decrement: item.qty } },
        })
      }
    }

    // Increment mekanik total selesai
    const mekanikWO = await tx.workOrderMekanik.findMany({ where: { workOrderId } })
    for (const mw of mekanikWO) {
      await tx.mekanik.update({
        where: { id: mw.mekanikId },
        data: { totalSelesai: { increment: 1 } },
      })
    }

    const trx = await tx.transaksi.create({
      data: {
        nomorTrx: genNomorTrx(),
        workOrderId,
        subtotal,
        diskon: diskonPersen,
        total,
        metode: metode || 'TUNAI',
        catatan,
        tenantId,
        items: {
          create: items.map((item: any) => ({
            tipe: item.tipe,
            jasaId: item.jasaId || null,
            sparePartId: item.sparePartId || null,
            nama: item.nama,
            qty: item.qty,
            harga: item.harga,
            subtotal: item.qty * item.harga,
          })),
        },
      },
      include: { items: true },
    })

    // Update WO status
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'BAYAR', waktuSelesai: new Date() },
    })

    return trx
  })

  return NextResponse.json(transaksi, { status: 201 })
}
