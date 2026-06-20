import { PrismaClient, Role, JenisKendaraan, KategoriPart, MetodeBayar, StatusWO } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding multi-tenant data...')

  // Create plans
  await prisma.plan.createMany({
    data: [
      {
        id: 'free',
        nama: 'Free',
        hargaBulan: 0,
        hargaTahun: 0,
        maxWorkOrder: 20,
        maxSparePart: 50,
        maxMekanik: 2,
        fitur: ['Work Order', 'Kasir', 'Spare Part (50)', '2 Mekanik', 'Laporan Dasar'],
        urutan: 1,
      },
      {
        id: 'basic',
        nama: 'Basic',
        hargaBulan: 149000,
        hargaTahun: 1490000,
        maxWorkOrder: 200,
        maxSparePart: 500,
        maxMekanik: 5,
        fitur: ['Semua Fitur Free', '200 WO/bulan', '500 Spare Part', '5 Mekanik', 'Laporan Detail', 'Cetak PDF'],
        urutan: 2,
      },
      {
        id: 'pro',
        nama: 'Pro',
        hargaBulan: 349000,
        hargaTahun: 3490000,
        maxWorkOrder: 1000,
        maxSparePart: -1,
        maxMekanik: -1,
        fitur: ['Semua Fitur Basic', '1000 WO/bulan', 'Unlimited Part', 'Unlimited Mekanik', 'Multi User', 'Laporan Premium'],
        urutan: 3,
      },
      {
        id: 'enterprise',
        nama: 'Enterprise',
        hargaBulan: 699000,
        hargaTahun: 6990000,
        maxWorkOrder: -1,
        maxSparePart: -1,
        maxMekanik: -1,
        fitur: ['Semua Fitur Pro', 'Unlimited Semua', 'White Label', 'API Access', 'Dedicated Support', 'Custom Integrasi'],
        urutan: 4,
      },
    ],
  })
  console.log('✅ Plans created')

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      namaToko: 'Bengkel Jaya',
      slug: 'bengkel-jaya',
      alamat: 'Jl. Merdeka No. 42, Pontianak',
      telepon: '0561-123456',
      plan: 'pro',
      isActive: true,
    },
  })
  console.log('✅ Tenant created: Bengkel Jaya')

  // Create counter
  const now = new Date()
  const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  await prisma.tenantCounter.create({
    data: { tenantId: tenant.id, bulan, jumlahWO: 0, jumlahPart: 0 },
  })

  const hash = await bcrypt.hash('admin123', 10)
  const hash2 = await bcrypt.hash('kasir123', 10)
  const hash3 = await bcrypt.hash('mekanik123', 10)

  // Create users
  const admin = await prisma.user.create({
    data: { name: 'Admin Jaya', email: 'admin@bengkeljaya.com', password: hash, role: Role.ADMIN, tenantId: tenant.id },
  })
  await prisma.user.create({
    data: { name: 'Kasir Jaya', email: 'kasir@bengkeljaya.com', password: hash2, role: Role.KASIR, tenantId: tenant.id },
  })
  const mekanikUser = await prisma.user.create({
    data: { name: 'Mekanik Jaya', email: 'mekanik@bengkeljaya.com', password: hash3, role: Role.MEKANIK, tenantId: tenant.id },
  })
  console.log('✅ Users created')

  // Create mekanik
  const mek1 = await prisma.mekanik.create({
    data: { nama: 'Budi Santoso', spesialis: 'MOTOR', hp: '081234567890', tenantId: tenant.id },
  })
  const mek2 = await prisma.mekanik.create({
    data: { nama: 'Andi Wijaya', spesialis: 'MOBIL', hp: '081234567891', tenantId: tenant.id },
  })
  const mek3 = await prisma.mekanik.create({
    data: { nama: 'Dedi Kurniawan', spesialis: 'UMUM', hp: '081234567892', tenantId: tenant.id },
  })
  console.log('✅ Mekanik created')

  // Create kendaraan
  const kend1 = await prisma.kendaraan.create({
    data: { plat: 'KB 1234 AB', jenis: JenisKendaraan.MOTOR, merk: 'Honda', tipe: 'Vario 125', tahun: 2022, pemilik: 'Rahmat', hp: '085678901234', tenantId: tenant.id },
  })
  const kend2 = await prisma.kendaraan.create({
    data: { plat: 'KB 5678 CD', jenis: JenisKendaraan.MOBIL, merk: 'Toyota', tipe: 'Avanza', tahun: 2021, pemilik: 'Siti Aminah', hp: '085678901235', tenantId: tenant.id },
  })
  const kend3 = await prisma.kendaraan.create({
    data: { plat: 'KB 9012 EF', jenis: JenisKendaraan.MOTOR, merk: 'Yamaha', tipe: 'NMAX', tahun: 2023, pemilik: 'Joko', hp: '085678901236', tenantId: tenant.id },
  })
  console.log('✅ Kendaraan created')

  // Create spare parts
  const parts = [
    { nama: 'Oli AHM MPX 2', kategori: 'MOTOR' as KategoriPart, satuan: 'liter', stok: 50, hargaBeli: 28000, hargaJual: 35000, minStok: 10 },
    { nama: 'Filter Udara Vario', kategori: 'MOTOR' as KategoriPart, satuan: 'pcs', stok: 20, hargaBeli: 35000, hargaJual: 50000, minStok: 5 },
    { nama: 'Busi NGK CR7HSA', kategori: 'MOTOR' as KategoriPart, satuan: 'pcs', stok: 30, hargaBeli: 15000, hargaJual: 22000, minStok: 10 },
    { nama: 'Kampas Rem Depan', kategori: 'MOTOR' as KategoriPart, satuan: 'set', stok: 15, hargaBeli: 25000, hargaJual: 40000, minStok: 5 },
    { nama: 'V-Belt Honda', kategori: 'MOTOR' as KategoriPart, satuan: 'pcs', stok: 8, hargaBeli: 65000, hargaJual: 95000, minStok: 3 },
    { nama: 'Oli Mesin 10W-40', kategori: 'MOBIL' as KategoriPart, satuan: 'liter', stok: 30, hargaBeli: 55000, hargaJual: 75000, minStok: 8 },
    { nama: 'Filter Oli Avanza', kategori: 'MOBIL' as KategoriPart, satuan: 'pcs', stok: 12, hargaBeli: 30000, hargaJual: 45000, minStok: 5 },
    { nama: 'Aki GS Astra', kategori: 'UMUM' as KategoriPart, satuan: 'pcs', stok: 5, hargaBeli: 280000, hargaJual: 350000, minStok: 2 },
    { nama: 'Radiator Coolant', kategori: 'MOBIL' as KategoriPart, satuan: 'liter', stok: 10, hargaBeli: 35000, hargaJual: 50000, minStok: 3 },
    { nama: 'Gear Set SSS', kategori: 'MOTOR' as KategoriPart, satuan: 'set', stok: 4, hargaBeli: 180000, hargaJual: 250000, minStok: 2 },
  ]

  const partRecords = []
  for (const p of parts) {
    const record = await prisma.sparePart.create({
      data: { ...p, tenantId: tenant.id },
    })
    partRecords.push(record)
  }
  console.log('✅ Spare parts created')

  // Create jasa
  const jasaList = [
    { nama: 'Servis Ringan', kategori: 'MOTOR', harga: 30000, deskripsi: 'Ganti oli + cek ringan' },
    { nama: 'Servis Besar', kategori: 'MOTOR', harga: 150000, deskripsi: 'Turun mesin + ganti part' },
    { nama: 'Ganti Ban', kategori: 'MOTOR', harga: 25000, deskripsi: 'Jasa pasang ban (di luar harga ban)' },
    { nama: 'Ganti Oli', kategori: 'UMUM', harga: 20000, deskripsi: 'Jasa ganti oli mesin' },
    { nama: 'Tune Up', kategori: 'MOBIL', harga: 200000, deskripsi: 'Service tune up kendaraan' },
    { nama: 'Ganti Kampas Rem', kategori: 'UMUM', harga: 30000, deskripsi: 'Jasa ganti kampas rem' },
    { nama: 'Cuci + Poles', kategori: 'UMUM', harga: 50000, deskripsi: 'Cuci dan poles kendaraan' },
    { nama: 'Diagnosa Injeksi', kategori: 'MOTOR', harga: 40000, deskripsi: 'Cek & diagnosa sistem injeksi' },
  ]

  const jasaRecords = []
  for (const j of jasaList) {
    const record = await prisma.jasa.create({
      data: { ...j, tenantId: tenant.id },
    })
    jasaRecords.push(record)
  }
  console.log('✅ Jasa created')

  // Create some sample Work Orders + Transaksi
  const wo1 = await prisma.workOrder.create({
    data: {
      nomorWO: `WO-2606-A001`,
      kendaraanId: kend1.id,
      keluhan: 'Mesin brebet, oli sudah hitam',
      catatan: 'Perlu ganti oli + servis ringan',
      estimasi: 350000,
      status: 'SELESAI',
      tenantId: tenant.id,
      waktuSelesai: new Date(),
      mekaniks: { create: [{ mekanikId: mek1.id, userId: mekanikUser.id }] },
    },
  })

  await prisma.transaksi.create({
    data: {
      nomorTrx: 'TRX-260619-X001',
      workOrderId: wo1.id,
      subtotal: 115000,
      diskon: 0,
      total: 115000,
      metode: 'TUNAI',
      tenantId: tenant.id,
      items: {
        create: [
          { tipe: 'JASA', jasaId: jasaRecords[0].id, nama: 'Servis Ringan', qty: 1, harga: 30000, subtotal: 30000 },
          { tipe: 'PART', sparePartId: partRecords[0].id, nama: 'Oli AHM MPX 2', qty: 1, harga: 35000, subtotal: 35000 },
          { tipe: 'PART', sparePartId: partRecords[2].id, nama: 'Busi NGK CR7HSA', qty: 1, harga: 22000, subtotal: 22000 },
          { tipe: 'JASA', jasaId: jasaRecords[3].id, nama: 'Ganti Oli', qty: 1, harga: 20000, subtotal: 20000 },
          { tipe: 'PART', sparePartId: partRecords[3].id, nama: 'Kampas Rem Depan', qty: 1, harga: 8000, subtotal: 8000 },
        ],
      },
    },
  })

  await prisma.tenantCounter.update({
    where: { tenantId_bulan: { tenantId: tenant.id, bulan } },
    data: { jumlahWO: { increment: 1 } },
  })

  const wo2 = await prisma.workOrder.create({
    data: {
      nomorWO: `WO-2606-A002`,
      kendaraanId: kend2.id,
      keluhan: 'AC tidak dingin, mesin suara kasar',
      estimasi: 500000,
      status: 'PROSES',
      tenantId: tenant.id,
      mekaniks: { create: [{ mekanikId: mek2.id }] },
    },
  })

  const wo3 = await prisma.workOrder.create({
    data: {
      nomorWO: `WO-2606-A003`,
      kendaraanId: kend3.id,
      keluhan: 'Rem bunyi, v-belt sudah aus',
      estimasi: 200000,
      status: 'ANTRI',
      tenantId: tenant.id,
      mekaniks: { create: [{ mekanikId: mek3.id }] },
    },
  })

  console.log('✅ Sample Work Orders & Transaksi created')
  console.log('\n🎉 Seed completed!')
  console.log('\n📋 Login:')
  console.log('   Admin:    admin@bengkeljaya.com / admin123')
  console.log('   Kasir:    kasir@bengkeljaya.com / kasir123')
  console.log('   Mekanik:  mekanik@bengkeljaya.com / mekanik123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
