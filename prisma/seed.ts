import { PrismaClient, Role, JenisKendaraan, KategoriPart } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Users
  const adminPass = await bcrypt.hash('admin123', 10)
  const kasirPass = await bcrypt.hash('kasir123', 10)
  const mekPass   = await bcrypt.hash('mekanik123', 10)

  await prisma.user.upsert({ where: { email: 'admin@bengkel.com' }, update: {}, create: { name: 'Administrator', email: 'admin@bengkel.com', password: adminPass, role: Role.ADMIN } })
  await prisma.user.upsert({ where: { email: 'kasir@bengkel.com' }, update: {}, create: { name: 'Kasir Utama', email: 'kasir@bengkel.com', password: kasirPass, role: Role.KASIR } })
  await prisma.user.upsert({ where: { email: 'mekanik@bengkel.com' }, update: {}, create: { name: 'Budi Mekanik', email: 'mekanik@bengkel.com', password: mekPass, role: Role.MEKANIK } })

  // Mekanik
  const mekaniks = [
    { nama: 'Budi Santoso', spesialis: 'MOBIL', hp: '081234567890' },
    { nama: 'Agus Riyanto', spesialis: 'MOTOR', hp: '082233445566' },
    { nama: 'Hendra Wijaya', spesialis: 'ALAT_BERAT', hp: '083344556677' },
    { nama: 'Doni Prasetyo', spesialis: 'LISTRIK', hp: '084455667788' },
  ]
  for (const m of mekaniks) {
    await prisma.mekanik.upsert({ where: { id: m.nama }, update: {}, create: m }).catch(() => prisma.mekanik.create({ data: m }))
  }

  // Spare Part
  const parts = [
    { nama: 'Oli Mesin 10W-40', kategori: KategoriPart.UMUM, satuan: 'liter', stok: 24, minStok: 10, hargaBeli: 45000, hargaJual: 65000 },
    { nama: 'Filter Udara Honda Beat', kategori: KategoriPart.MOTOR, satuan: 'pcs', stok: 6, minStok: 10, hargaBeli: 22000, hargaJual: 35000 },
    { nama: 'Kampas Rem Cakram Set', kategori: KategoriPart.UMUM, satuan: 'set', stok: 2, minStok: 5, hargaBeli: 75000, hargaJual: 120000 },
    { nama: 'Filter Oli Mobil', kategori: KategoriPart.MOBIL, satuan: 'pcs', stok: 15, minStok: 8, hargaBeli: 25000, hargaJual: 45000 },
    { nama: 'Oli Hidrolik 46', kategori: KategoriPart.ALAT_BERAT, satuan: 'liter', stok: 40, minStok: 15, hargaBeli: 35000, hargaJual: 55000 },
    { nama: 'Busi Iridium', kategori: KategoriPart.MOTOR, satuan: 'pcs', stok: 3, minStok: 10, hargaBeli: 45000, hargaJual: 75000 },
    { nama: 'V-Belt Motor', kategori: KategoriPart.MOTOR, satuan: 'pcs', stok: 8, minStok: 5, hargaBeli: 30000, hargaJual: 50000 },
    { nama: 'Freon AC R134a', kategori: KategoriPart.MOBIL, satuan: 'kg', stok: 5, minStok: 3, hargaBeli: 80000, hargaJual: 130000 },
  ]
  for (const p of parts) {
    await prisma.sparePart.create({ data: p }).catch(() => {})
  }

  // Jasa
  const jasas = [
    { nama: 'Tune Up Motor', kategori: 'MOTOR', harga: 85000 },
    { nama: 'Ganti Oli Motor', kategori: 'MOTOR', harga: 50000 },
    { nama: 'Servis Rem Motor', kategori: 'MOTOR', harga: 75000 },
    { nama: 'Tune Up Mobil', kategori: 'MOBIL', harga: 175000 },
    { nama: 'Servis AC Mobil', kategori: 'MOBIL', harga: 250000 },
    { nama: 'Ganti Oli Mobil', kategori: 'MOBIL', harga: 100000 },
    { nama: 'Spooring & Balancing', kategori: 'MOBIL', harga: 200000 },
    { nama: 'Servis Alat Berat', kategori: 'ALAT_BERAT', harga: 500000 },
    { nama: 'Ganti Oli Hidrolik', kategori: 'ALAT_BERAT', harga: 350000 },
    { nama: 'Overhaul Mesin', kategori: 'UMUM', harga: 1500000 },
  ]
  for (const j of jasas) {
    await prisma.jasa.create({ data: j }).catch(() => {})
  }

  console.log('✅ Seed selesai!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
