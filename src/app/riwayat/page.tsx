'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import Modal from '@/components/Modal'
import CetakNota from '@/components/CetakNota'
import { rp, fmtDateTime } from '@/lib/utils'

const Btn = ({ onClick, children, variant='default' }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600} }
  return <button onClick={onClick} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

export default function RiwayatPage() {
  const { status } = useSession()
  const router = useRouter()
  const [trxList, setTrxList] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [cetakTrx, setCetakTrx] = useState<any>(null)
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { if (status==='unauthenticated') router.push('/login') },[status,router])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search',search)
    const d = await fetch(`/api/transaksi?${params}`, { credentials: 'include' }).then(r=>r.json())
    setTrxList(Array.isArray(d)?d:[])
  },[search])

  useEffect(() => {
    if (status==='authenticated') {
      load()
      fetch('/api/tenant', { credentials: 'include' }).then(r => r.json()).then(d => setTenantInfo(d)).catch(() => {})
    }
  },[status,load])

  if (status==='loading') return null

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{flex:1,overflow:'auto',padding:isMobile?12:20,paddingTop:isMobile?52:20,display:'flex',flexDirection:'column',gap:14}}>
        <h1 style={{fontSize:isMobile?16:18,fontWeight:600}}>Riwayat Servis</h1>
        <div style={{display:'flex',gap:8}}>
          <input style={{flex:1,minWidth:120}} placeholder="Cari plat / pemilik..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
          <Btn onClick={load}>Cari</Btn>
        </div>

        {/* Desktop */}
        <div className="hide-mobile" style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <div className="scroll-x">
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Tanggal','No. Trx','No. WO','Plat','Pemilik','Total','Metode','Aksi'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>
                {trxList.map(t=>(
                  <tr key={t.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t3)'}}>{fmtDateTime(t.createdAt)}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'#60A5FA'}}>{t.nomorTrx}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'#F59E0B'}}>{t.workOrder?.nomorWO}</td>
                    <td style={{padding:'9px 12px',fontSize:12,fontWeight:500}}>{t.workOrder?.kendaraan?.plat}</td>
                    <td style={{padding:'9px 12px',fontSize:12}}>{t.workOrder?.kendaraan?.pemilik}</td>
                    <td style={{padding:'9px 12px',fontSize:13,fontWeight:600,color:'#34D399'}}>{rp(t.total)}</td>
                    <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{t.metode}</span></td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <Btn onClick={()=>setDetail(t)}>👁 Detail</Btn>
                        <Btn variant="amber" onClick={()=>setCetakTrx(t)}>🖨</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {!trxList.length && <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada riwayat transaksi</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="hide-desktop">
          {trxList.map(t=>(
            <div key={t.id} style={{background:'var(--bg2)',borderRadius:10,border:'0.5px solid var(--border)',padding:12,marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:11,color:'#60A5FA'}}>{t.nomorTrx}</span>
                <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{t.metode}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:11,color:'var(--t3)'}}>{fmtDateTime(t.createdAt)}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#34D399'}}>{rp(t.total)}</span>
              </div>
              <div style={{fontSize:12,fontWeight:500}}>{t.workOrder?.kendaraan?.plat} · {t.workOrder?.kendaraan?.pemilik}</div>
              <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>WO: {t.workOrder?.nomorWO}</div>
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <Btn onClick={()=>setDetail(t)}>Detail</Btn>
                <Btn variant="amber" onClick={()=>setCetakTrx(t)}>Cetak</Btn>
              </div>
            </div>
          ))}
          {!trxList.length && <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontSize:12}}>Belum ada riwayat transaksi</div>}
        </div>
      </main>

      {detail && (
        <Modal title={`Detail — ${detail.nomorTrx}`} onClose={()=>setDetail(null)}
          footer={<><Btn onClick={()=>setDetail(null)}>Tutup</Btn><Btn variant="amber" onClick={()=>{setDetail(null);setCetakTrx(detail)}}>🖨 Cetak Ulang Struk</Btn></>}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:14}}>
            <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:2}}>Kendaraan</div><div style={{fontSize:14,fontWeight:600,color:'#F59E0B'}}>{detail.workOrder?.kendaraan?.plat}</div><div style={{fontSize:12,color:'var(--t2)'}}>{detail.workOrder?.kendaraan?.pemilik}</div></div>
            <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:2}}>Waktu</div><div style={{fontSize:12}}>{fmtDateTime(detail.createdAt)}</div></div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--t2)',marginBottom:8,fontWeight:500}}>Item Transaksi</div>
            {detail.items?.map((item:any)=>(
              <div key={item.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)'}}>
                <div>
                  <div style={{fontSize:12}}>{item.nama}</div>
                  <div style={{fontSize:10,color:'var(--t3)'}}>{item.qty}x {rp(item.harga)}</div>
                </div>
                <div style={{fontSize:12,fontWeight:500}}>{rp(item.subtotal)}</div>
              </div>
            ))}
          </div>
          <div style={{borderTop:'0.5px solid var(--border)',paddingTop:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--t2)',marginBottom:4}}><span>Subtotal</span><span>{rp(detail.subtotal)}</span></div>
            {detail.diskon>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--t2)',marginBottom:4}}><span>Diskon {detail.diskon}%</span><span>-{rp(detail.subtotal*detail.diskon/100)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,color:'#F59E0B',marginTop:6}}><span>Total</span><span>{rp(detail.total)}</span></div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>Metode: {detail.metode}</div>
          </div>
        </Modal>
      )}

      {cetakTrx && <CetakNota transaksi={cetakTrx} tenant={tenantInfo?.tenant || tenantInfo} onClose={() => setCetakTrx(null)} />}
    </div>
  )
}
