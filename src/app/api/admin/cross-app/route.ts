import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const ADMIN_SECRET = process.env.CROSS_APP_SECRET || 'z-ecosystem-admin-2026'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hp: true,
        aktif: true,
        faceId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Cross-app list users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, email, data } = await req.json()

    switch (action) {
      case 'create': {
        if (!data?.name || !data?.email || !data?.password) {
          return NextResponse.json({ error: 'name, email, password wajib' }, { status: 400 })
        }

        const existing = await prisma.user.findUnique({ where: { email: data.email } })
        if (existing) {
          return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
        }

        const hashed = await bcrypt.hash(data.password, 10)
        const user = await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            password: hashed,
            role: data.role || 'KASIR',
            hp: data.phone || null,
            tenantId: data.tenantId || undefined,
          },
          select: { id: true, name: true, email: true, role: true },
        })

        return NextResponse.json({ success: true, user }, { status: 201 })
      }

      default: {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        switch (action) {
          case 'updateRole':
            await prisma.user.update({ where: { email }, data: { role: data.role } })
            return NextResponse.json({ success: true })

          case 'updateActive':
            await prisma.user.update({ where: { email }, data: { aktif: data.aktif } })
            return NextResponse.json({ success: true })

          case 'resetPassword':
            if (!data.password || data.password.length < 6) {
              return NextResponse.json({ error: 'Password min 6 karakter' }, { status: 400 })
            }
            const hashed = await bcrypt.hash(data.password, 10)
            await prisma.user.update({ where: { email }, data: { password: hashed } })
            return NextResponse.json({ success: true })

          case 'delete':
            await prisma.user.delete({ where: { email } })
            return NextResponse.json({ success: true })

          default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }
      }
    }
  } catch (error) {
    console.error('Cross-app user action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
