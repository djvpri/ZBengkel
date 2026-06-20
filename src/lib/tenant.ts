import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface TenantSession {
  tenantId: string
  role: string
  userId: string
}

export async function getTenantFromSession(): Promise<TenantSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const user = session.user as any
  if (!user.tenantId) return null
  return {
    tenantId: user.tenantId,
    role: user.role,
    userId: user.id,
  }
}

export async function requireTenant(): Promise<TenantSession> {
  const tenant = await getTenantFromSession()
  if (!tenant) {
    throw new Error('Unauthorized: No tenant found')
  }
  return tenant
}
