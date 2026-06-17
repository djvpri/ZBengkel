import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, hp: true, aktif: true, createdAt: true }, orderBy: { name: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const hash = await bcrypt.hash(body.password || 'bengkel123', 10)
  const u = await prisma.user.create({ data: { name: body.name, email: body.email, password: hash, role: body.role, hp: body.hp } })
  return NextResponse.json({ id: u.id, name: u.name, email: u.email, role: u.role })
}
