'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'

const Btn = ({ onClick, children, variant='default', disabled }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600}, danger:{background:'transparent',border:'0.5px solid rgba(248,113,113,0.4)',color:'#F87171'} }
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

const emptyForm = { plat:'', jenis:'MOTOR', merk:'', tipe:'', tahun:'', warna:'', pemilik:'', hp:'', alamat:'' }
const jenisIcon: any = { MOTOR:'🏍️', MOBIL:'🚗', ALAT_BERAT:'🚜' }

export default function KendaraanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kends, setKends] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<any>(null)
  const [saving, setSaving] = useState(false)
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
    const d = await fetch(`/api/kendaraan?${params}`, { credentials: 'include' }).then(r=>r.json())
    setKends(Array.isArray(d)?d:[])
  },[search])

  useEffect(() => { if (status==='authenticated') load() },[status,load])

  const save = async () => {
    if (!form.plat||!form.pemilik) { setToast({msg:'Plat dan pemilik wajib!',type:'error'}); return }
    setSaving(true)
    const res = await fetch('/api/kendaraan',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({...form,tahun:form.tahun?+form.tahun:undefined})})
    setSaving(false)
    if (res.ok) { setModal(false); load(); setToast({msg:'Kendaraan disimpan!',type:'success'}) }
    else setToast({msg:'Gagal menyimpan',type:'error'})
  }

  const del = async (id: string) => {
    if (!confirm('Hapus kendaraan ini?')) return
    await fetch(`/api/kendaraan/${id}`,{method:'DELETE',credentials:'include'})
    load(); setToast({msg:'Dihapus',type:'success'})
  }

  if (status==='loading') return null
  const role = (session?.user as any)?.role

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{flex:1,overflow:'auto',padding:isMobile?12:20,paddingTop:isMobile?52:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <h1 style={{fontSize:isMobile?16:18,fontWeight:600}}>Data Kendaraan</h1>
          {(role==='ADMIN'||role==='KASIR') && <Btn variant="amber" onClick={()=>{setForm(emptyForm);setModal(true)}}>+ Tambah Kendaraan</Btn>}
        </div>
        <div style={{display:'flex',gap:8}}>
          <input style={{flex:1,minWidth:120}} placeholder="Cari plat / pemilik..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
          <Btn onClick={load}>Cari</Btn>
        </div>

        {/* Desktop */}
        <div className="hide-mobile" style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <div className="scroll-x">
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['No. Plat','Jenis','Merk & Tipe','Tahun','Pemilik','No. HP','Total WO','Aksi'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>
                {kends.map(k=>(
                  <tr key={k.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                    <td style={{padding:'9px 12px',fontSize:13,fontWeight:600,color:'#F59E0B'}}>{k.plat}</td>
                    <td style={{padding:'9px 12px'}}><span style={{fontSize:13}}>{jenisIcon[k.jenis]}</span> <span style={{fontSize:11,color:'var(--t2)'}}>{k.jenis}</span></td>
                    <td style={{padding:'9px 12px',fontSize:12}}>{k.merk} {k.tipe}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t3)'}}>{k.tahun||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:12}}>{k.pemilik}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t2)'}}>{k.hp||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:12,color:'#60A5FA',fontWeight:500}}>{k._count?.workOrders||0}x</td>
                    <td style={{padding:'9px 12px'}}>
                      {role==='ADMIN' && <Btn variant="danger" onClick={()=>del(k.id)}>🗑</Btn>}
                    </td>
                  </tr>
                ))}
                {!kends.length && <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada kendaraan</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile */}
        <div className="hide-desktop">
          {kends.map(k=>(
            <div key={k.id} style={{background:'var(--bg2)',borderRadius:10,border:'0.5px solid var(--border)',padding:12,marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:600,color:'#F59E0B'}}>{k.plat}</span>
                <span style={{fontSize:12}}>{jenisIcon[k.jenis]} <span style={{fontSize:11,color:'var(--t2)'}}>{k.jenis}</span></span>
              </div>
              <div style={{fontSize:12}}>{k.merk} {k.tipe} {k.tahun ? `(${k.tahun})` : ''}</div>
              <div style={{fontSize:11,color:'var(--t2)',marginTop:2}}>👤 {k.pemilik} · {k.hp || '—'}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                <span style={{fontSize:11,color:'#60A5FA'}}>{k._count?.workOrders||0} Work Order</span>
                {role==='ADMIN' && <Btn variant="danger" onClick={()=>del(k.id)}>Hapus</Btn>}
              </div>
            </div>
          ))}
          {!kends.length && <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontSize:12}}>Belum ada kendaraan</div>}
        </div>
      </main>

      {modal && (
        <Modal title="Tambah Kendaraan" onClose={()=>setModal(false)}
          footer={<><Btn onClick={()=>setModal(false)}>Batal</Btn><Btn variant="amber" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</Btn></>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>No. Plat / ID Unit *</label><input value={form.plat} onChange={e=>setForm(f=>({...f,plat:e.target.value.toUpperCase()}))} placeholder="KB 1234 AB" /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Jenis *</label>
                <select value={form.jenis} onChange={e=>setForm(f=>({...f,jenis:e.target.value}))}>
                  <option value="MOTOR">Motor</option><option value="MOBIL">Mobil</option><option value="ALAT_BERAT">Alat Berat</option>
                </select>
              </div>
            </div>
            <div className="form-grid-3" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Merk</label><input value={form.merk} onChange={e=>setForm(f=>({...f,merk:e.target.value}))} placeholder="Honda" /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Tipe</label><input value={form.tipe} onChange={e=>setForm(f=>({...f,tipe:e.target.value}))} placeholder="Beat 2021" /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Tahun</label><input type="number" value={form.tahun} onChange={e=>setForm(f=>({...f,tahun:e.target.value}))} placeholder="2021" /></div>
            </div>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Nama Pemilik *</label><input value={form.pemilik} onChange={e=>setForm(f=>({...f,pemilik:e.target.value}))} /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>No. HP</label><input value={form.hp} onChange={e=>setForm(f=>({...f,hp:e.target.value}))} placeholder="08xxxxxxxxxx" /></div>
            </div>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Alamat</label><input value={form.alamat} onChange={e=>setForm(f=>({...f,alamat:e.target.value}))} /></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
