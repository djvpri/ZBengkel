'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { rp } from '@/lib/utils'

const Btn = ({ onClick, children, variant='default', disabled }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600}, danger:{background:'transparent',border:'0.5px solid rgba(248,113,113,0.4)',color:'#F87171'} }
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

const emptyForm = { nama:'', kategori:'UMUM', harga:'0', deskripsi:'' }

export default function JasaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [jasas, setJasas] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (status==='unauthenticated') router.push('/login') },[status,router])
  const load = async () => { const d = await fetch('/api/jasa').then(r=>r.json()); setJasas(Array.isArray(d)?d:[]) }
  useEffect(() => { if (status==='authenticated') load() },[status])

  const save = async () => {
    if (!form.nama) { setToast({msg:'Nama wajib!',type:'error'}); return }
    setSaving(true)
    const res = await fetch('/api/jasa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,harga:+form.harga})})
    setSaving(false)
    if (res.ok) { setModal(false); load(); setToast({msg:'Jasa ditambahkan!',type:'success'}) }
    else setToast({msg:'Gagal',type:'error'})
  }

  if (status==='loading') return null
  const role = (session?.user as any)?.role

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar />
      <main style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1 style={{fontSize:18,fontWeight:600}}>Daftar Jasa</h1>
          {role==='ADMIN' && <Btn variant="amber" onClick={()=>{setForm(emptyForm);setModal(true)}}>+ Tambah Jasa</Btn>}
        </div>
        <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Nama Jasa','Kategori','Harga'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
            <tbody>
              {jasas.map(j=>(
                <tr key={j.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                  <td style={{padding:'9px 12px',fontSize:12,fontWeight:500}}>{j.nama}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{j.kategori}</span></td>
                  <td style={{padding:'9px 12px',fontSize:13,fontWeight:600,color:'#F59E0B'}}>{rp(j.harga)}</td>
                </tr>
              ))}
              {!jasas.length && <tr><td colSpan={3} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada jasa</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
      {modal && (
        <Modal title="Tambah Jasa" onClose={()=>setModal(false)}
          footer={<><Btn onClick={()=>setModal(false)}>Batal</Btn><Btn variant="amber" onClick={save} disabled={saving}>{saving?'...':'Simpan'}</Btn></>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Nama Jasa *</label><input value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Kategori</label>
                <select value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                  <option value="MOTOR">Motor</option><option value="MOBIL">Mobil</option><option value="ALAT_BERAT">Alat Berat</option><option value="UMUM">Umum</option>
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Harga (Rp)</label><input type="number" value={form.harga} onChange={e=>setForm(f=>({...f,harga:e.target.value}))} /></div>
            </div>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Deskripsi</label><input value={form.deskripsi} onChange={e=>setForm(f=>({...f,deskripsi:e.target.value}))} /></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
