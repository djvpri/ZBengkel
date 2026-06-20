import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const ZFACE_SECRET = process.env.FACE_LOGIN_SECRET || process.env.NEXTAUTH_SECRET || ''

export async function POST(req: Request) {
  try {
    const { faceToken } = await req.json()

    if (!faceToken) {
      return NextResponse.json({ error: 'Face token required' }, { status: 400 })
    }

    let payload: any
    try {
      payload = jwt.verify(faceToken, ZFACE_SECRET)
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!payload.face_login) {
      return NextResponse.json({ error: 'Not a face login token' }, { status: 400 })
    }

    const faceId = payload.sub
    const personName = payload.person_name

    if (!faceId) {
      return NextResponse.json({ error: 'No face ID' }, { status: 400 })
    }

    // Find user by faceId
    let user = await prisma.user.findUnique({ where: { faceId } })

    // Fallback: name match
    if (!user && personName) {
      const allUsers = await prisma.user.findMany({ where: { aktif: true } })
      const faceName = personName.toLowerCase().trim()
      const faceParts = faceName.split(/\s+/)

      let bestScore = 0
      for (const u of allUsers) {
        const userName = u.name.toLowerCase().trim()
        const userParts = userName.split(/\s+/)
        let score = 0

        if (userName === faceName) score = 100
        else if (userName.includes(faceName) || faceName.includes(userName)) score = 80
        else {
          for (const fp of faceParts) {
            for (const up of userParts) {
              if (fp === up) score += 60
              else if (fp.includes(up) || up.includes(fp)) score += 30
            }
          }
        }

        if (score > bestScore) {
          bestScore = score
          user = u
        }
      }
      if (bestScore < 30) user = null
    }

    if (!user) {
      return NextResponse.json({
        error: `Wajah "${personName}" tidak cocok`,
      }, { status: 404 })
    }

    // Link faceId if not linked
    if (!user.faceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { faceId },
      })
    }

    return NextResponse.json({
      success: true,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      personName,
    })
  } catch (error) {
    console.error('Face verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
