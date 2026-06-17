import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const where: any = {}
  if (search) where.OR = [
    { plat: { contains: search, mode: 'insensitive' } },
    { pemilik: { contains: search, mode: 'insensitive' } },
  ]
  const data = await prisma.kendaraan.findMany({ where, include: { _count: { select: { workOrders: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const k = await prisma.kendaraan.upsert({ where: { plat: body.plat.toUpperCase() }, update: body, create: { ...body, plat: body.plat.toUpperCase() } })
  return NextResponse.json(k)
}
