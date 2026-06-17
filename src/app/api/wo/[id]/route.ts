import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: { kendaraan: true, mekaniks: { include: { mekanik: true } }, transaksi: { include: { items: true } } },
  })
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(wo)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { status, mekanikIds, keluhan, catatan, estimasi } = body
  const data: any = {}
  if (status) { data.status = status; if (status === 'SELESAI') data.waktuSelesai = new Date() }
  if (keluhan) data.keluhan = keluhan
  if (catatan !== undefined) data.catatan = catatan
  if (estimasi !== undefined) data.estimasi = +estimasi
  if (mekanikIds) {
    await prisma.workOrderMekanik.deleteMany({ where: { workOrderId: params.id } })
    data.mekaniks = { create: mekanikIds.map((id: string) => ({ mekanikId: id })) }
  }
  const wo = await prisma.workOrder.update({ where: { id: params.id }, data, include: { kendaraan: true, mekaniks: { include: { mekanik: true } } } })
  return NextResponse.json(wo)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.workOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
