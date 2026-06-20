import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { namaToko, slug, email, password, nama } = body

    if (!namaToko || !slug || !email || !password || !nama) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } })
    if (existingTenant) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create tenant + owner in transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          namaToko,
          slug,
          plan: 'free',
        },
      })

      const user = await tx.user.create({
        data: {
          name: nama,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      })

      // Initialize counter for this month
      const now = new Date()
      const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      await tx.tenantCounter.create({
        data: {
          tenantId: tenant.id,
          bulan,
          jumlahWO: 0,
          jumlahPart: 0,
        },
      })

      return { tenant, user }
    })

    return NextResponse.json({
      message: 'Registrasi berhasil! Silakan login.',
      tenant: { id: result.tenant.id, namaToko: result.tenant.namaToko, slug: result.tenant.slug },
    })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
