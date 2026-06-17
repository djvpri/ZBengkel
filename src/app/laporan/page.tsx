'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { rp, fmtDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function LaporanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0,7))
  const [lap, setLap] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (status==='unauthenticated') router.push('/login') },[status,router])

  const load = async () => {
    setLoading(true)
    const d = await fetch(`/api/laporan?bulan=${bulan}`).then(r=>r.json())
    setLap(d); setLoading(false)
  }

  useEffect(() => { if (status==='authenticated') load() },[status,bulan])

  const harianData = lap ? Object.entries(lap.harian||{}).map(([date,val])=>({date:date.slice(8),val})) : []
  const jenisData = lap ? [
    {name:'Motor',value:lap.perJenis?.MOTOR||0,color:'#60A5FA'},
    {name:'Mobil',value:lap.perJenis?.MOBIL||0,color:'#34D399'},
    {name:'Alat Berat',value:lap.perJenis?.ALAT_BERAT||0,color:'#F59E0B'},
  ] : []

  const cetakPDF = async () => {
    if (!lap) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setFont('helvetica','bold')
    doc.text('LAPORAN OMZET BENGKEL POS', 14, 20)
    doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(`Periode: ${bulan}`, 14, 28)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 34)

    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Ringkasan', 14, 46)
    const ringkasan = [['Total Omzet', rp(lap.omzet||0)],['Jumlah Transaksi',String(lap.jumlahTrx||0)],['Rata-rata/Transaksi',rp(lap.avg||0)],['WO Selesai',String(lap.woSelesai||0)]]
    autoTable(doc,{startY:50,head:[['Indikator','Nilai']],body:ringkasan,theme:'striped',styles:{fontSize:10},headStyles:{fillColor:[245,158,11],textColor:0}})

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Top Jasa / Spare Part', 14, finalY)
    autoTable(doc,{startY:finalY+4,head:[['Nama Item','Total Omzet']],body:(lap.topJasa||[]).map((j:any)=>[j.nama,rp(j.total)]),theme:'striped',styles:{fontSize:10},headStyles:{fillColor:[245,158,11],textColor:0}})

    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Stok Kritis', 14, y2)
    autoTable(doc,{startY:y2+4,head:[['Nama Part','Stok','Min Stok','Satuan']],body:(lap.stokKritis||[]).map((s:any)=>[s.nama,String(s.stok),String(s.minStok),s.satuan]),theme:'striped',styles:{fontSize:10},headStyles:{fillColor:[248,113,113],textColor:255}})

    doc.save(`laporan-bengkel-${bulan}.pdf`)
  }

  if (status==='loading') return null

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar />
      <main style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1 style={{fontSize:18,fontWeight:600}}>Laporan Omzet</h1>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <input type="month" value={bulan} onChange={e=>setBulan(e.target.value)} style={{width:160}} />
            <button onClick={cetakPDF} style={{padding:'7px 14px',background:'#F59E0B',border:'none',borderRadius:8,color:'#0F1623',fontWeight:600,fontSize:12,cursor:'pointer'}}>🖨 Export PDF</button>
          </div>
        </div>

        {loading ? <div style={{textAlign:'center',padding:40,color:'var(--t3)'}}>Memuat data...</div> : <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[
              {label:'Omzet Bulan Ini',val:rp(lap?.omzet||0),color:'#F59E0B',icon:'💰'},
              {label:'Total Transaksi',val:lap?.jumlahTrx||0,color:'rgba(255,255,255,0.85)',icon:'🧾'},
              {label:'Rata-rata/Transaksi',val:rp(lap?.avg||0),color:'#34D399',icon:'📈'},
              {label:'WO Selesai',val:lap?.woSelesai||0,color:'#60A5FA',icon:'✅'},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--bg2)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
                <div style={{fontSize:11,color:'var(--t3)',marginBottom:6}}>{s.icon} {s.label}</div>
                <div style={{fontSize:20,fontWeight:700,color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
            <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',padding:16}}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:12,color:'var(--t2)'}}>📊 Omzet Harian</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={harianData}>
                  <XAxis dataKey="date" tick={{fill:'rgba(255,255,255,0.3)',fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'rgba(255,255,255,0.3)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000}k`} />
                  <Tooltip formatter={(v:any)=>rp(v)} contentStyle={{background:'var(--bg1)',border:'0.5px solid var(--border)',borderRadius:6,fontSize:11}} />
                  <Bar dataKey="val" fill="#F59E0B" radius={[3,3,0,0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',padding:16}}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:'var(--t2)'}}>🥧 Per Jenis Kendaraan</div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={jenisData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                    {jenisData.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.8} />)}
                  </Pie>
                  <Tooltip formatter={(v:any)=>rp(v)} contentStyle={{background:'var(--bg1)',border:'0.5px solid var(--border)',borderRadius:6,fontSize:11}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginTop:4}}>
                {jenisData.map(j=><div key={j.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--t2)'}}><div style={{width:8,height:8,borderRadius:'50%',background:j.color}}></div>{j.name}</div>)}
              </div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)'}}>
              <div style={{padding:'11px 14px',borderBottom:'0.5px solid var(--border)',fontSize:12,fontWeight:500,color:'var(--t2)'}}>🏆 Top Jasa & Spare Part</div>
              {(lap?.topJasa||[]).map((j:any,i:number)=>{
                const maxVal = lap.topJasa[0]?.total||1
                return <div key={i} style={{padding:'8px 14px',borderBottom:'0.5px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12}}>{j.nama}</span>
                    <span style={{fontSize:12,fontWeight:500,color:'#F59E0B'}}>{rp(j.total)}</span>
                  </div>
                  <div style={{height:4,background:'rgba(255,255,255,0.07)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{width:`${j.total/maxVal*100}%`,height:'100%',background:'#F59E0B',borderRadius:2}} />
                  </div>
                </div>
              })}
              {!lap?.topJasa?.length && <div style={{padding:20,textAlign:'center',color:'var(--t3)',fontSize:12}}>Belum ada data</div>}
            </div>

            <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)'}}>
              <div style={{padding:'11px 14px',borderBottom:'0.5px solid var(--border)',fontSize:12,fontWeight:500,color:'#F87171'}}>⚠️ Stok Kritis</div>
              {(lap?.stokKritis||[]).map((s:any)=>(
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderBottom:'0.5px solid var(--border)'}}>
                  <div>
                    <div style={{fontSize:12}}>{s.nama}</div>
                    <div style={{fontSize:10,color:'var(--t3)'}}>{s.kategori}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:'#F87171'}}>{s.stok} {s.satuan}</span>
                </div>
              ))}
              {!lap?.stokKritis?.length && <div style={{padding:20,textAlign:'center',color:'#34D399',fontSize:12}}>✅ Semua stok aman</div>}
            </div>
          </div>
        </>}
      </main>
    </div>
  )
}
