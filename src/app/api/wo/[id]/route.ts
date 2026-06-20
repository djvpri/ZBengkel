import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const wo = await prisma.workOrder.findFirst({
    where: { id: params.id, tenantId },
    include: {
      kendaraan: true,
      mekaniks: { include: { mekanik: true } },
      transaksi: true,
    },
  })
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(wo)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const existing = await prisma.workOrder.findFirst({ where: { id: params.id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.mekanikIds !== undefined) {
    await prisma.workOrderMekanik.deleteMany({ where: { workOrderId: params.id } })
    if (body.mekanikIds.length) {
      await prisma.workOrderMekanik.createMany({
        data: body.mekanikIds.map((mekanikId: string) => ({ workOrderId: params.id, mekanikId })),
      })
    }
    delete body.mekanikIds
  }

  if (body.status === 'SELESAI') body.waktuSelesai = new Date()

  const wo = await prisma.workOrder.update({
    where: { id: params.id },
    data: body,
    include: { kendaraan: true, mekaniks: { include: { mekanik: true } } },
  })
  return NextResponse.json(wo)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const existing = await prisma.workOrder.findFirst({ where: { id: params.id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.workOrderMekanik.deleteMany({ where: { workOrderId: params.id } })
  await prisma.workOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
