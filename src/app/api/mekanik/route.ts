import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkMekanikLimit } from '@/lib/plan-check'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const spesialis = searchParams.get('spesialis')

  const where: any = { tenantId }
  if (search) where.nama = { contains: search, mode: 'insensitive' }
  if (spesialis) where.spesialis = spesialis

  const mekaniks = await prisma.mekanik.findMany({
    where,
    orderBy: { nama: 'asc' },
    include: { _count: { select: { workOrders: true } } },
  })
  return NextResponse.json(mekaniks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const limit = await checkMekanikLimit(tenantId)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 403 })
  }

  const body = await req.json()
  if (!body.nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const mekanik = await prisma.mekanik.create({ data: { ...body, tenantId } })
  return NextResponse.json(mekanik, { status: 201 })
}
