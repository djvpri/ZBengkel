import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getTenantPlan, checkWorkOrderLimit, checkSparePartLimit, checkMekanikLimit } from '@/lib/plan-check'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const data = await getTenantPlan(tenantId)
  const woLimit = await checkWorkOrderLimit(tenantId)
  const spLimit = await checkSparePartLimit(tenantId)
  const mkLimit = await checkMekanikLimit(tenantId)

  return NextResponse.json({
    tenant: data?.tenant,
    plan: data?.plan,
    limits: {
      workOrder: woLimit,
      sparePart: spLimit,
      mekanik: mkLimit,
    },
  })
}
