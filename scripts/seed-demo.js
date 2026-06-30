// Seed data DEMO untuk ZBengkel — mengisi tenant akun demo dengan kendaraan,
// mekanik, jasa, spare part, work order, dan transaksi servis tersebar ~2 bulan.
//
// IDEMPOTENT / RESET MANUAL: tiap dijalankan, data demo lama tenant ini DIHAPUS
// lalu diisi ulang (user/tenant TIDAK dihapus). Reset:  node scripts/seed-demo.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@zomet.my.id'
const DEMO_SLUG = process.env.DEMO_SLUG || 'demo'

const now = new Date()
const base = Date.now()
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const LET = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const rletters = (n) => Array.from({ length: n }, () => LET[rint(0, LET.length - 1)]).join('')
function daysAgo(n, hour) {
  const d = new Date(now); d.setDate(d.getDate() - n)
  d.setHours(hour != null ? hour : rint(8, 17), rint(0, 59), 0, 0); return d
}

const NAMA = ['Budi', 'Sari', 'Andi', 'Dewi', 'Rizky', 'Agus', 'Hendra', 'Bayu', 'Eko', 'Dimas',
  'Fajar', 'Yoga', 'Reza', 'Galih', 'Aldi', 'Putra', 'Wahyu', 'Joko']
const JASA = [
  ['Ganti Oli', 'RUTIN', 50000], ['Servis Ringan', 'RUTIN', 75000], ['Tune Up', 'BERAT', 150000],
  ['Ganti Kampas Rem', 'REM', 60000], ['Servis CVT', 'BERAT', 90000], ['Pasang Ban', 'BAN', 40000],
  ['Servis AC Mobil', 'AC', 200000],
]
const PART = [
  ['Oli Mesin 1L', 'pcs', 35000, 55000], ['Filter Oli', 'pcs', 15000, 25000],
  ['Kampas Rem Set', 'set', 45000, 75000], ['Busi', 'pcs', 20000, 35000],
  ['Ban Motor', 'pcs', 180000, 250000], ['Aki Motor', 'pcs', 200000, 290000],
  ['V-Belt', 'pcs', 80000, 130000], ['Kampas Kopling', 'set', 90000, 150000],
]
const MERK_MOTOR = ['Honda Vario', 'Yamaha NMAX', 'Honda Beat', 'Yamaha Aerox', 'Honda PCX', 'Suzuki Satria']
const MERK_MOBIL = ['Toyota Avanza', 'Daihatsu Xenia', 'Honda Brio', 'Toyota Innova', 'Suzuki Ertiga']
const KELUHAN = ['Servis rutin', 'Ganti oli', 'Rem kurang pakem', 'Mesin terasa kasar', 'Motor tidak mau hidup',
  'Ada suara aneh di mesin', 'Tarikan berat', 'AC kurang dingin', 'Ban bocor']

async function main() {
  const demoUser = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } })
  let tenantId = demoUser?.tenantId
  if (!tenantId) tenantId = (await prisma.tenant.findFirst({ where: { slug: DEMO_SLUG } }))?.id
  if (!tenantId) tenantId = (await prisma.tenant.findFirst())?.id
  if (!tenantId) throw new Error('Tidak ada tenant di ZBengkel. Buat tenant dulu.')
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const opUserId = demoUser && demoUser.tenantId === tenantId ? demoUser.id : null
  console.log(`Target tenant: ${tenant.namaToko} (${tenant.slug})`)

  // RESET (transaksi cascade item; workOrder cascade workOrderMekanik)
  await prisma.transaksi.deleteMany({ where: { tenantId } })
  await prisma.workOrder.deleteMany({ where: { tenantId } })
  await prisma.kendaraan.deleteMany({ where: { tenantId } })
  await prisma.mekanik.deleteMany({ where: { tenantId } })
  await prisma.sparePart.deleteMany({ where: { tenantId } })
  await prisma.jasa.deleteMany({ where: { tenantId } })
  console.log('Data demo lama dibersihkan.')

  // Mekanik
  const mekanik = []
  for (const [nama, spec] of [['Slamet', 'MOTOR'], ['Joko', 'MOBIL'], ['Rudi', 'UMUM']]) {
    mekanik.push(await prisma.mekanik.create({ data: { tenantId, nama, spesialis: spec } }))
  }
  // Jasa
  const jasa = []
  for (const [nama, kat, harga] of JASA) jasa.push(await prisma.jasa.create({ data: { tenantId, nama, kategori: kat, harga } }))
  // Spare part
  const part = []
  for (const [nama, satuan, beli, jual] of PART) {
    part.push(await prisma.sparePart.create({
      data: { tenantId, nama, satuan, stok: rint(10, 60), minStok: 5, hargaBeli: beli, hargaJual: jual },
    }))
  }
  // Kendaraan
  const kendaraan = []
  for (let i = 0; i < 15; i++) {
    const isMobil = Math.random() < 0.3
    kendaraan.push(await prisma.kendaraan.create({
      data: {
        tenantId,
        plat: `KB ${rint(1000, 9999)}${i} ${rletters(2)}`,
        jenis: isMobil ? 'MOBIL' : 'MOTOR',
        merk: isMobil ? pick(MERK_MOBIL) : pick(MERK_MOTOR),
        tahun: rint(2015, 2024),
        warna: pick(['Hitam', 'Putih', 'Merah', 'Silver', 'Biru']),
        pemilik: `${pick(NAMA)} ${pick(NAMA)}`,
        hp: `0852${String(rint(10000000, 99999999))}`,
      },
    }))
  }

  // Work order + transaksi
  let woCount = 0, trxCount = 0, omzet = 0
  for (let i = 0; i < 30; i++) {
    const kn = pick(kendaraan)
    const waktuMasuk = daysAgo(rint(0, 60))
    const ageDays = Math.floor((now - waktuMasuk) / 86400000)
    let status
    if (ageDays > 5) status = pick(['BAYAR', 'BAYAR', 'SELESAI'])
    else if (ageDays > 2) status = pick(['SELESAI', 'PROSES', 'BAYAR'])
    else status = pick(['ANTRI', 'PROSES'])
    const selesai = status === 'SELESAI' || status === 'BAYAR'

    const wo = await prisma.workOrder.create({
      data: {
        tenantId, kendaraanId: kn.id,
        nomorWO: `WO-${base}-${i}`,
        keluhan: pick(KELUHAN),
        estimasi: rint(50, 500) * 1000,
        status,
        waktuMasuk,
        waktuSelesai: selesai ? new Date(waktuMasuk.getTime() + rint(2, 30) * 3600000) : null,
        mekaniks: { create: [{ mekanikId: pick(mekanik).id, userId: opUserId }] },
      },
    })
    woCount++

    if (status === 'BAYAR') {
      // Transaksi: 1-2 jasa + 0-2 sparepart
      const items = []
      const nJasa = rint(1, 2)
      for (let j = 0; j < nJasa; j++) {
        const js = pick(jasa)
        items.push({ tipe: 'JASA', jasaId: js.id, nama: js.nama, qty: 1, harga: js.harga, subtotal: js.harga })
      }
      const nPart = rint(0, 2)
      for (let p = 0; p < nPart; p++) {
        const sp = pick(part); const qty = rint(1, 2)
        items.push({ tipe: 'PART', sparePartId: sp.id, nama: sp.nama, qty, harga: sp.hargaJual, subtotal: sp.hargaJual * qty })
      }
      const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
      const diskon = Math.random() < 0.15 ? Math.round(subtotal * 0.05 / 1000) * 1000 : 0
      const total = subtotal - diskon
      await prisma.transaksi.create({
        data: {
          tenantId, workOrderId: wo.id, nomorTrx: `TRX-${base}-${i}`,
          subtotal, diskon, total, metode: pick(['TUNAI', 'TUNAI', 'QRIS', 'TRANSFER', 'DEBIT']),
          createdAt: wo.waktuSelesai || waktuMasuk,
          items: { create: items },
        },
      })
      trxCount++
      omzet += total
    }
  }

  console.log('✅ Seed demo ZBengkel selesai:')
  console.log(`   kendaraan=${kendaraan.length}, mekanik=${mekanik.length}, jasa=${jasa.length}, part=${part.length}`)
  console.log(`   workOrder=${woCount}, transaksi=${trxCount} (omzet Rp${omzet.toLocaleString('id-ID')})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
