import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { incrementWorkOrderCount, checkWorkOrderLimit } from '@/lib/plan-check'

function genNomorWO() {
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `WO-${y}${m}-${rand}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: any = { tenantId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { nomorWO: { contains: search, mode: 'insensitive' } },
      { kendaraan: { plat: { contains: search, mode: 'insensitive' } } },
      { kendaraan: { pemilik: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const wos = await prisma.workOrder.findMany({
    where,
    include: {
      kendaraan: true,
      mekaniks: { include: { mekanik: true } },
      _count: { select: { mekaniks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(wos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  // Check plan limit
  const limit = await checkWorkOrderLimit(tenantId)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 403 })
  }

  const body = await req.json()
  const { kendaraanId, keluhan, catatan, estimasi, mekanikIds } = body
  if (!kendaraanId || !keluhan) {
    return NextResponse.json({ error: 'Kendaraan dan keluhan wajib diisi' }, { status: 400 })
  }

  const nomorWO = genNomorWO()

  const wo = await prisma.workOrder.create({
    data: {
      nomorWO,
      kendaraanId,
      keluhan,
      catatan,
      estimasi: estimasi || 0,
      status: 'ANTRI',
      tenantId,
      mekaniks: mekanikIds?.length
        ? { create: mekanikIds.map((id: string) => ({ mekanikId: id })) }
        : undefined,
    },
    include: { kendaraan: true, mekaniks: { include: { mekanik: true } } },
  })

  await incrementWorkOrderCount(tenantId)

  return NextResponse.json(wo, { status: 201 })
}
