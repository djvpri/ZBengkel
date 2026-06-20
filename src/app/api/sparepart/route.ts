import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkSparePartLimit, incrementSparePartCount } from '@/lib/plan-check'

function genKode() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SP-${rand}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const lowStok = searchParams.get('lowStok')
  const kategori = searchParams.get('kategori')

  const where: any = { tenantId }
  if (search) {
    where.OR = [
      { nama: { contains: search, mode: 'insensitive' } },
      { kode: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (lowStok === 'true') where.stok = { lte: prisma.sparePart.fields.minStok as any }
  if (kategori) where.kategori = kategori

  const parts = await prisma.sparePart.findMany({ where, orderBy: { nama: 'asc' } })
  return NextResponse.json(parts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const limit = await checkSparePartLimit(tenantId)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 403 })
  }

  const body = await req.json()
  if (!body.nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const part = await prisma.sparePart.create({
    data: {
      ...body,
      kode: body.kode || genKode(),
      tenantId,
    },
  })
  return NextResponse.json(part, { status: 201 })
}
