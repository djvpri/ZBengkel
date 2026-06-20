import prisma from '@/lib/prisma'

interface PlanCheckResult {
  allowed: boolean
  current: number
  max: number
  planName: string
  message: string
}

const UNLIMITED = -1

async function getCurrentMonth(): Promise<string> {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getTenantPlan(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return null
  const plan = await prisma.plan.findUnique({ where: { id: tenant.plan } })
  const defaultPlan = { id: 'free', nama: 'Free', maxWorkOrder: 20, maxSparePart: 50, maxMekanik: 2 }
  return { tenant, plan: plan || defaultPlan }
}

export async function checkWorkOrderLimit(tenantId: string): Promise<PlanCheckResult> {
  const result = await getTenantPlan(tenantId)
  if (!result) return { allowed: false, current: 0, max: 0, planName: 'Unknown', message: 'Plan tidak ditemukan' }
  const { plan } = result

  const bulan = await getCurrentMonth()
  const counter = await prisma.tenantCounter.findUnique({
    where: { tenantId_bulan: { tenantId, bulan } },
  })

  const current = counter?.jumlahWO || 0
  const max = plan.maxWorkOrder

  if (max === UNLIMITED) {
    return { allowed: true, current, max: UNLIMITED, planName: plan.nama, message: 'Unlimited' }
  }

  return {
    allowed: current < max,
    current,
    max,
    planName: plan.nama,
    message: current >= max ? `Batas Work Order tercapai (${max}/${plan.nama}). Upgrade plan untuk melanjutkan.` : `${current}/${max} Work Order bulan ini`,
  }
}

export async function checkSparePartLimit(tenantId: string): Promise<PlanCheckResult> {
  const result = await getTenantPlan(tenantId)
  if (!result) return { allowed: false, current: 0, max: 0, planName: 'Unknown', message: 'Plan tidak ditemukan' }
  const { plan } = result

  const current = await prisma.sparePart.count({ where: { tenantId } })
  const max = plan.maxSparePart

  if (max === UNLIMITED) {
    return { allowed: true, current, max: UNLIMITED, planName: plan.nama, message: 'Unlimited' }
  }

  return {
    allowed: current < max,
    current,
    max,
    planName: plan.nama,
    message: current >= max ? `Batas Spare Part tercapai (${max}/${plan.nama}). Upgrade plan untuk melanjutkan.` : `${current}/${max} Spare Part`,
  }
}

export async function checkMekanikLimit(tenantId: string): Promise<PlanCheckResult> {
  const result = await getTenantPlan(tenantId)
  if (!result) return { allowed: false, current: 0, max: 0, planName: 'Unknown', message: 'Plan tidak ditemukan' }
  const { plan } = result

  const current = await prisma.mekanik.count({ where: { tenantId } })
  const max = plan.maxMekanik

  if (max === UNLIMITED) {
    return { allowed: true, current, max: UNLIMITED, planName: plan.nama, message: 'Unlimited' }
  }

  return {
    allowed: current < max,
    current,
    max,
    planName: plan.nama,
    message: current >= max ? `Batas Mekanik tercapai (${max}/${plan.nama}). Upgrade plan untuk melanjutkan.` : `${current}/${max} Mekanik`,
  }
}

export async function incrementWorkOrderCount(tenantId: string): Promise<void> {
  const bulan = await getCurrentMonth()
  await prisma.tenantCounter.upsert({
    where: { tenantId_bulan: { tenantId, bulan } },
    update: { jumlahWO: { increment: 1 } },
    create: { tenantId, bulan, jumlahWO: 1, jumlahPart: 0 },
  })
}

export async function incrementSparePartCount(tenantId: string): Promise<void> {
  const bulan = await getCurrentMonth()
  await prisma.tenantCounter.upsert({
    where: { tenantId_bulan: { tenantId, bulan } },
    update: { jumlahPart: { increment: 1 } },
    create: { tenantId, bulan, jumlahWO: 0, jumlahPart: 1 },
  })
}
