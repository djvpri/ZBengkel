'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/Modal'
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

  useEffect(() => { if (status==='unauthenticated') router.push('/login') },[status,router])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search',search)
    const d = await fetch(`/api/transaksi?${params}`).then(r=>r.json())
    setTrxList(Array.isArray(d)?d:[])
  },[search])

  useEffect(() => { if (status==='authenticated') load() },[status,load])

  const cetakStruk = async (trx: any) => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({format:[58,210],unit:'mm'})
    const w=58; let y=8
    const center=(txt:string,size=8)=>{doc.setFontSize(size);const tw=doc.getTextWidth(txt);doc.text(txt,(w-tw)/2,y);y+=size*0.5}
    const row=(l:string,r:string,size=7)=>{doc.setFontSize(size);doc.text(l,3,y);doc.text(r,w-3,y,{align:'right'});y+=size*0.45}
    const line=()=>{doc.setLineWidth(0.2);doc.line(3,y,w-3,y);y+=3}
    doc.setFont('courier','bold');center('BENGKEL POS',10);y+=2
    doc.setFont('courier','normal');center('Struk Pembayaran',7);y+=3
    line()
    row('No Trx:',trx.nomorTrx);row('Plat:',trx.workOrder?.kendaraan?.plat||'');row('Pemilik:',trx.workOrder?.kendaraan?.pemilik||'')
    row('Tgl:',new Date(trx.createdAt).toLocaleDateString('id-ID'))
    const meks=(trx.workOrder?.mekaniks||[]).map((wm:any)=>wm.mekanik?.nama).join(', ')
    if(meks) row('Mekanik:',meks)
    y+=2;line()
    trx.items?.forEach((item:any)=>{doc.setFontSize(7);doc.text(item.nama,3,y);y+=4;row(`  ${item.qty}x ${rp(item.harga)}`,rp(item.subtotal))})
    y+=1;line()
    row('Subtotal',rp(trx.subtotal))
    if(trx.diskon) row(`Diskon ${trx.diskon}%`,`-${rp(trx.subtotal*trx.diskon/100)}`)
    y+=1;doc.setFont('courier','bold');row('TOTAL',rp(trx.total),9);y+=1
    doc.setFont('courier','normal');row('Bayar',trx.metode)
    y+=3;line();center('Terima kasih!',8);y+=2;center('Garansi servis 7 hari',7)
    doc.autoPrint();doc.output('dataurlnewwindow')
  }

  if (status==='loading') return null

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar />
      <main style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <h1 style={{fontSize:18,fontWeight:600}}>Riwayat Servis</h1>
        <div style={{display:'flex',gap:10}}>
          <input style={{flex:1}} placeholder="Cari plat / pemilik..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
          <Btn onClick={load}>Cari</Btn>
        </div>
        <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Tanggal','No. Trx','No. WO','Plat','Pemilik','Total','Metode','Aksi'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
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
                      <Btn variant="amber" onClick={()=>cetakStruk(t)}>🖨</Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {!trxList.length && <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada riwayat transaksi</td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {detail && (
        <Modal title={`Detail — ${detail.nomorTrx}`} onClose={()=>setDetail(null)}
          footer={<><Btn onClick={()=>setDetail(null)}>Tutup</Btn><Btn variant="amber" onClick={()=>cetakStruk(detail)}>🖨 Cetak Ulang Struk</Btn></>}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
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
    </div>
  )
}
