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
  const kategori = searchParams.get('kategori')

  const where: any = { tenantId }
  if (search) where.nama = { contains: search, mode: 'insensitive' }
  if (kategori) where.kategori = kategori

  const jasas = await prisma.jasa.findMany({ where, orderBy: { nama: 'asc' } })
  return NextResponse.json(jasas)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  if (!body.nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const jasa = await prisma.jasa.create({ data: { ...body, tenantId } })
  return NextResponse.json(jasa, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  const existing = await prisma.jasa.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const jasa = await prisma.jasa.update({ where: { id }, data })
  return NextResponse.json(jasa)
}
