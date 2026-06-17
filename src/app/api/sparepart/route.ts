import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const kat = searchParams.get('kategori')
  const search = searchParams.get('search')
  const where: any = {}
  if (kat) where.kategori = kat
  if (search) where.nama = { contains: search, mode: 'insensitive' }
  const data = await prisma.sparePart.findMany({ where, orderBy: { nama: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const sp = await prisma.sparePart.create({ data: { ...body, stok: +body.stok, minStok: +body.minStok, hargaBeli: +body.hargaBeli, hargaJual: +body.hargaJual } })
  return NextResponse.json(sp)
}
