'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { fmtDate } from '@/lib/utils'

const Btn = ({ onClick, children, variant='default', disabled }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600} }
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

const roleColor: any = { ADMIN:['rgba(167,139,250,0.15)','#A78BFA'], KASIR:['rgba(52,211,153,0.12)','#34D399'], MEKANIK:['rgba(245,158,11,0.12)','#F59E0B'] }

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'KASIR', hp:'' })
  const [toast, setToast] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status==='unauthenticated') router.push('/login')
    if (status==='authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/')
  },[status,session,router])

  const load = async () => { const d = await fetch('/api/users').then(r=>r.json()); setUsers(Array.isArray(d)?d:[]) }
  useEffect(() => { if (status==='authenticated') load() },[status])

  const save = async () => {
    if (!form.name||!form.email||!form.password) { setToast({msg:'Nama, email, password wajib!',type:'error'}); return }
    setSaving(true)
    const res = await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSaving(false)
    if (res.ok) { setModal(false); load(); setToast({msg:'User berhasil dibuat!',type:'success'}) }
    else setToast({msg:'Gagal membuat user',type:'error'})
  }

  if (status==='loading') return null

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar />
      <main style={{flex:1,overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1 style={{fontSize:18,fontWeight:600}}>Kelola User</h1>
          <Btn variant="amber" onClick={()=>{setForm({name:'',email:'',password:'',role:'KASIR',hp:''});setModal(true)}}>+ Tambah User</Btn>
        </div>
        <div style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Nama','Email','Role','No. HP','Dibuat'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u=>{
                const [bg,color] = roleColor[u.role]||['rgba(255,255,255,0.07)','var(--t2)']
                const init = u.name.split(' ').map((n:string)=>n[0]).slice(0,2).join('')
                return <tr key={u.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:'#F59E0B'}}>{init}</div>
                      <span style={{fontSize:12,fontWeight:500}}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'var(--t2)'}}>{u.email}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:bg,color,fontWeight:500}}>{u.role}</span></td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'var(--t2)'}}>{u.hp||'—'}</td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'var(--t3)'}}>{fmtDate(u.createdAt)}</td>
                </tr>
              })}
              {!users.length && <tr><td colSpan={5} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada user</td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <Modal title="Tambah User" onClose={()=>setModal(false)}
          footer={<><Btn onClick={()=>setModal(false)}>Batal</Btn><Btn variant="amber" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</Btn></>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Nama Lengkap *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Email *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Password *</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 karakter" /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="ADMIN">Admin</option><option value="KASIR">Kasir</option><option value="MEKANIK">Mekanik</option>
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>No. HP</label><input value={form.hp} onChange={e=>setForm(f=>({...f,hp:e.target.value}))} placeholder="08xxxxxxxxxx" /></div>
            </div>
            <div style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:8,fontSize:11,color:'var(--t3)'}}>
              <div style={{fontWeight:500,color:'var(--t2)',marginBottom:4}}>Akses per Role:</div>
              <div>• <b style={{color:'#A78BFA'}}>Admin</b> — Akses penuh semua fitur</div>
              <div>• <b style={{color:'#34D399'}}>Kasir</b> — WO, Kasir, Riwayat</div>
              <div>• <b style={{color:'#F59E0B'}}>Mekanik</b> — Lihat WO yang ditugaskan</div>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
