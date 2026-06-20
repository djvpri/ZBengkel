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
  const search = searchParams.get('search')

  const where: any = { tenantId }
  if (search) {
    where.OR = [
      { plat: { contains: search, mode: 'insensitive' } },
      { pemilik: { contains: search, mode: 'insensitive' } },
    ]
  }

  const kends = await prisma.kendaraan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { workOrders: true } } },
  })
  return NextResponse.json(kends)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  if (!body.plat || !body.pemilik) {
    return NextResponse.json({ error: 'Plat dan pemilik wajib diisi' }, { status: 400 })
  }

  const k = await prisma.kendaraan.create({ data: { ...body, tenantId } })
  return NextResponse.json(k, { status: 201 })
}
