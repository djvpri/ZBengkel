import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

declare module 'next-auth' {
  interface User {
    tenantId?: string
    tenantNama?: string
    role?: string
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      tenantId?: string
      tenantNama?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    tenantId?: string
    tenantNama?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const email = credentials.email as string
        const password = credentials.password as string
        
        // Face login
        if (password.startsWith('face:')) {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true },
          })
          if (!user || !user.aktif) return null
          if (!user.tenantId || !user.tenant?.isActive) return null
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            tenantNama: user.tenant.namaToko,
          }
        }
        
        // Normal login
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        })
        if (!user || !user.aktif) return null
        if (!user.tenantId || !user.tenant?.isActive) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantNama: user.tenant.namaToko,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantNama = (user as any).tenantNama
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.role = token.role
        session.user.tenantId = token.tenantId
        session.user.tenantNama = token.tenantNama
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
