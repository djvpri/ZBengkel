'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'

const Btn = ({ onClick, children, variant='default', disabled }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600}, danger:{background:'transparent',border:'0.5px solid rgba(248,113,113,0.4)',color:'#F87171'} }
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

const emptyForm = { nama:'', spesialis:'UMUM', hp:'', aktif:'true' }
const spesMap: any = { UMUM:'Umum',MOTOR:'Motor',MOBIL:'Mobil',ALAT_BERAT:'Alat Berat',LISTRIK:'Kelistrikan',AC:'AC/Pendingin' }

export default function MekanikPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mekaniks, setMekaniks] = useState<any[]>([])
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

  useEffect(() => { if (status==='unauthenticated') router.push('/login') }, [status,router])

  const load = async () => {
    const d = await fetch('/api/mekanik', { credentials: 'include' }).then(r=>r.json())
    setMekaniks(Array.isArray(d)?d:[])
  }
  useEffect(() => { if (status==='authenticated') load() },[status])

  const save = async () => {
    if (!form.nama) { setToast({msg:'Nama wajib!',type:'error'}); return }
    setSaving(true)
    const res = await fetch('/api/mekanik',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({...form,aktif:form.aktif==='true'})})
    setSaving(false)
    if (res.ok) { setModal(false); load(); setToast({msg:'Mekanik ditambahkan!',type:'success'}) }
    else setToast({msg:'Gagal menyimpan',type:'error'})
  }

  const del = async (id: string) => {
    if (!confirm('Hapus mekanik ini?')) return
    await fetch(`/api/mekanik/${id}`,{method:'DELETE',credentials:'include'})
    load(); setToast({msg:'Dihapus',type:'success'})
  }

  const toggleAktif = async (m: any) => {
    await fetch(`/api/mekanik/${m.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({aktif:!m.aktif})})
    load()
  }

  if (status==='loading') return null
  const role = (session?.user as any)?.role

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{flex:1,overflow:'auto',padding:isMobile?12:20,paddingTop:isMobile?52:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <h1 style={{fontSize:isMobile?16:18,fontWeight:600}}>Data Mekanik</h1>
          {role==='ADMIN' && <Btn variant="amber" onClick={()=>{setForm(emptyForm);setModal(true)}}>+ Tambah Mekanik</Btn>}
        </div>

        {/* Desktop */}
        <div className="hide-mobile" style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Nama','Spesialisasi','No. HP','Status','Total Selesai','Aksi'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>
              {mekaniks.map(m => {
                const init = m.nama.split(' ').map((n:string)=>n[0]).slice(0,2).join('')
                return <tr key={m.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'#F59E0B',flexShrink:0}}>{init}</div>
                      <span style={{fontWeight:500,fontSize:12}}>{m.nama}</span>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{spesMap[m.spesialis]||m.spesialis}</span></td>
                  <td style={{padding:'9px 12px',fontSize:12,color:'var(--t2)'}}>{m.hp||'—'}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:m.aktif?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.07)',color:m.aktif?'#34D399':'rgba(255,255,255,0.4)',fontWeight:500}}>{m.aktif?'Aktif':'Nonaktif'}</span></td>
                  <td style={{padding:'9px 12px',fontSize:12,color:'#34D399',fontWeight:500}}>{m.totalSelesai}</td>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <Btn onClick={()=>toggleAktif(m)}>{m.aktif?'Nonaktifkan':'Aktifkan'}</Btn>
                      {role==='ADMIN' && <Btn variant="danger" onClick={()=>del(m.id)}>🗑</Btn>}
                    </div>
                  </td>
                </tr>
              })}
              {!mekaniks.length && <tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada mekanik</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="hide-desktop">
          {mekaniks.map(m => {
            const init = m.nama.split(' ').map((n:string)=>n[0]).slice(0,2).join('')
            return <div key={m.id} style={{background:'var(--bg2)',borderRadius:10,border:'0.5px solid var(--border)',padding:12,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#F59E0B',flexShrink:0}}>{init}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{m.nama}</div>
                  <div style={{fontSize:10,color:'var(--t3)'}}>{spesMap[m.spesialis]||m.spesialis}</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:6}}>
                <span style={{color:'var(--t2)'}}>HP: {m.hp||'—'}</span>
                <span style={{color:'#34D399',fontWeight:500}}>✓ {m.totalSelesai} selesai</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:m.aktif?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.07)',color:m.aktif?'#34D399':'rgba(255,255,255,0.4)'}}>{m.aktif?'Aktif':'Nonaktif'}</span>
                <div style={{display:'flex',gap:4}}>
                  <Btn onClick={()=>toggleAktif(m)}>{m.aktif?'Nonaktifkan':'Aktifkan'}</Btn>
                  {role==='ADMIN' && <Btn variant="danger" onClick={()=>del(m.id)}>Hapus</Btn>}
                </div>
              </div>
            </div>
          })}
          {!mekaniks.length && <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontSize:12}}>Belum ada mekanik</div>}
        </div>
      </main>

      {modal && (
        <Modal title="Tambah Mekanik" onClose={()=>setModal(false)}
          footer={<><Btn onClick={()=>setModal(false)}>Batal</Btn><Btn variant="amber" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</Btn></>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Nama Mekanik *</label><input value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))} /></div>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Spesialisasi</label>
                <select value={form.spesialis} onChange={e=>setForm(f=>({...f,spesialis:e.target.value}))}>
                  {Object.entries(spesMap).map(([k,v])=><option key={k} value={k}>{v as string}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Status</label>
                <select value={form.aktif} onChange={e=>setForm(f=>({...f,aktif:e.target.value}))}>
                  <option value="true">Aktif</option><option value="false">Nonaktif</option>
                </select>
              </div>
            </div>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>No. HP</label><input value={form.hp} onChange={e=>setForm(f=>({...f,hp:e.target.value}))} placeholder="08xxxxxxxxxx" /></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
