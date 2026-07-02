import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Dual secret support during migration (2026-07-02)
const NEW_SECRET = process.env.CROSS_APP_SECRET || 'uurclTHL375CiZeWi2g4T3GczU2YNY9I1wzjlsVTgSk'
const OLD_SECRET = 'z-ecosystem-admin-2026'
const VALID_SECRETS = [NEW_SECRET, OLD_SECRET]

function isValidSecret(token: string): boolean {
  return VALID_SECRETS.includes(token)
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token || !isValidSecret(token)) {
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
        tenantId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        namaToko: true,
        slug: true,
        plan: true,
        planExpires: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users, tenants })
  } catch (error) {
    console.error('Cross-app list users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token || !isValidSecret(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, email, data } = await req.json()

    // --- Tenant actions (no user lookup needed) ---
    switch (action) {
      case 'createTenant': {
        if (!data?.namaToko || !data?.slug) {
          return NextResponse.json({ error: 'namaToko & slug wajib' }, { status: 400 })
        }
        const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } })
        if (existing) return NextResponse.json({ error: 'Slug sudah dipakai' }, { status: 409 })
        const tenant = await prisma.tenant.create({
          data: { namaToko: data.namaToko, slug: data.slug, plan: data.plan || 'free' },
          select: { id: true, namaToko: true, slug: true, plan: true },
        })
        return NextResponse.json({ success: true, tenant }, { status: 201 })
      }
      case 'updateTenant': {
        if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
        await prisma.tenant.update({
          where: { id: data.tenantId },
          data: {
            namaToko: data.namaToko || undefined,
            slug: data.slug || undefined,
            isActive: data.isActive ?? undefined,
            alamat: data.alamat || undefined,
            telepon: data.telepon || undefined,
          },
        })
        return NextResponse.json({ success: true })
      }
      case 'deleteTenant': {
        if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
        // Use raw SQL to avoid Prisma cascade/relation issues
        const tid = data.tenantId
        await prisma.$executeRawUnsafe(`DELETE FROM "WorkOrderMekanik" WHERE "workOrderId" IN (SELECT id FROM "WorkOrder" WHERE "tenantId" = $1)`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "TransaksiItem" WHERE "transaksiId" IN (SELECT id FROM "Transaksi" WHERE "tenantId" = $1)`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "Transaksi" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "WorkOrder" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "TenantCounter" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "Mekanik" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "Kendaraan" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "SparePart" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "Jasa" WHERE "tenantId" = $1`, tid)
        await prisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE "id" = $1`, tid)
        return NextResponse.json({ success: true })
      }
      case 'updatePlan': {
        if (!data?.tenantId || !data?.plan) return NextResponse.json({ error: 'tenantId & plan wajib' }, { status: 400 })
        await prisma.tenant.update({
          where: { id: data.tenantId },
          data: { plan: data.plan, planExpires: data.planExpires ? new Date(data.planExpires) : null },
        })
        return NextResponse.json({ success: true })
      }
    }

    // --- User actions (need user lookup) ---
    switch (action) {
      case 'create': {
        if (!data?.name || !data?.email || !data?.password) {
          return NextResponse.json({ error: 'name, email, password wajib' }, { status: 400 })
        }
        const dup = await prisma.user.findUnique({ where: { email: data.email } })
        if (dup) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })

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
          case 'updateRole': {
            // Role di ZBengkel enum uppercase (ADMIN/KASIR/MEKANIK). Z One kirim
            // role generik (mis. "admin") -> normalkan ke uppercase biar valid.
            const role = String(data?.role || '').toUpperCase()
            if (!['ADMIN', 'KASIR', 'MEKANIK'].includes(role)) {
              return NextResponse.json({ error: 'Role tidak valid (ADMIN/KASIR/MEKANIK)' }, { status: 400 })
            }
            await prisma.user.update({ where: { email }, data: { role: role as any } })
            return NextResponse.json({ success: true })
          }
          case 'moveTenant': {
            if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
            const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } })
            if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
            await prisma.user.update({ where: { email }, data: { tenantId: data.tenantId } })
            return NextResponse.json({ success: true })
          }
          case 'updateActive':
            await prisma.user.update({ where: { email }, data: { aktif: data.aktif } })
            return NextResponse.json({ success: true })
          case 'resetPassword': {
            if (!data.password || data.password.length < 6) {
              return NextResponse.json({ error: 'Password min 6 karakter' }, { status: 400 })
            }
            const hashed = await bcrypt.hash(data.password, 10)
            await prisma.user.update({ where: { email }, data: { password: hashed } })
            return NextResponse.json({ success: true })
          }
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
