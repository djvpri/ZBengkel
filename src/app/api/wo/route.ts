import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateNomorWO } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const where: any = {}
  if (status) where.status = status
  if (search) where.OR = [
    { kendaraan: { plat: { contains: search, mode: 'insensitive' } } },
    { kendaraan: { pemilik: { contains: search, mode: 'insensitive' } } },
  ]
  const data = await prisma.workOrder.findMany({
    where,
    include: {
      kendaraan: true,
      mekaniks: { include: { mekanik: true } },
    },
    orderBy: { waktuMasuk: 'desc' },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { plat, jenis, merk, tipe, tahun, warna, pemilik, hp, alamat, keluhan, catatan, estimasi, mekanikIds } = body
  if (!plat || !pemilik || !keluhan) return NextResponse.json({ error: 'Field wajib kurang' }, { status: 400 })

  const kendaraan = await prisma.kendaraan.upsert({
    where: { plat: plat.toUpperCase() },
    update: { pemilik, hp, alamat, merk, tipe, tahun: tahun ? +tahun : undefined, warna },
    create: { plat: plat.toUpperCase(), jenis, pemilik, hp, alamat, merk, tipe, tahun: tahun ? +tahun : undefined, warna },
  })

  const count = await prisma.workOrder.count()
  const nomorWO = generateNomorWO(count + 1)

  const wo = await prisma.workOrder.create({
    data: {
      nomorWO, kendaraanId: kendaraan.id, keluhan, catatan, estimasi: +estimasi || 0,
      mekaniks: mekanikIds?.length
        ? { create: mekanikIds.map((id: string) => ({ mekanikId: id })) }
        : undefined,
    },
    include: { kendaraan: true, mekaniks: { include: { mekanik: true } } },
  })
  return NextResponse.json(wo)
}
