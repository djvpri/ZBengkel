'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar, { HamburgerButton } from '@/components/Sidebar'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { rp } from '@/lib/utils'

const Btn = ({ onClick, children, variant='default', disabled }: any) => {
  const s: any = { default:{background:'transparent',border:'0.5px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)'}, amber:{background:'#F59E0B',border:'none',color:'#0F1623',fontWeight:600}, danger:{background:'transparent',border:'0.5px solid rgba(248,113,113,0.4)',color:'#F87171'}, success:{background:'transparent',border:'0.5px solid rgba(52,211,153,0.4)',color:'#34D399'} }
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:'5px 10px',borderRadius:6,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>{children}</button>
}

const emptyForm = { nama:'', kategori:'UMUM', satuan:'pcs', stok:'0', minStok:'5', hargaBeli:'0', hargaJual:'0', keterangan:'' }

export default function SparePartPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [parts, setParts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [modal, setModal] = useState<null|'add'|'edit'>(null)
  const [editId, setEditId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { if (status==='unauthenticated') router.push('/login') }, [status,router])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search',search)
    if (filterKat) params.set('kategori',filterKat)
    const d = await fetch(`/api/sparepart?${params}`, { credentials: 'include' }).then(r=>r.json())
    setParts(Array.isArray(d)?d:[])
  },[search,filterKat])

  useEffect(() => { if (status==='authenticated') load() },[status,load])

  const save = async () => {
    if (!form.nama) { setToast({msg:'Nama wajib!',type:'error'}); return }
    setSaving(true)
    const url = modal==='edit' ? `/api/sparepart/${editId}` : '/api/sparepart'
    const res = await fetch(url,{method:modal==='edit'?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({...form,stok:+form.stok,minStok:+form.minStok,hargaBeli:+form.hargaBeli,hargaJual:+form.hargaJual})})
    setSaving(false)
    if (res.ok) { setModal(null); load(); setToast({msg:'Spare part disimpan!',type:'success'}) }
    else setToast({msg:'Gagal menyimpan',type:'error'})
  }

  const del = async (id: string) => {
    if (!confirm('Hapus spare part ini?')) return
    await fetch(`/api/sparepart/${id}`,{method:'DELETE',credentials:'include'})
    load(); setToast({msg:'Dihapus',type:'success'})
  }

  const tambahStok = async (p: any) => {
    const n = prompt(`Tambah stok "${p.nama}"\nStok saat ini: ${p.stok} ${p.satuan}\n\nJumlah tambahan:`)
    if (!n||isNaN(+n)||+n<=0) return
    await fetch(`/api/sparepart/${p.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({stok:p.stok + +n})})
    load(); setToast({msg:`Stok +${n} ${p.satuan}`,type:'success'})
  }

  if (status==='loading') return null
  const role = (session?.user as any)?.role

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {isMobile && <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{flex:1,overflow:'auto',padding:isMobile?12:20,paddingTop:isMobile?52:20,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <h1 style={{fontSize:isMobile?16:18,fontWeight:600}}>Spare Part</h1>
          {role==='ADMIN' && <Btn variant="amber" onClick={()=>{setForm(emptyForm);setModal('add')}}>+ Tambah Part</Btn>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{flex:1,minWidth:120}} placeholder="Cari nama part..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
          <select style={{width:isMobile?'100%':140}} value={filterKat} onChange={e=>setFilterKat(e.target.value)}>
            <option value="">Semua Kategori</option>
            <option value="MOTOR">Motor</option><option value="MOBIL">Mobil</option><option value="ALAT_BERAT">Alat Berat</option><option value="UMUM">Umum</option>
          </select>
          <Btn onClick={load}>Cari</Btn>
        </div>

        {/* Desktop table */}
        <div className="hide-mobile" style={{background:'var(--bg2)',borderRadius:12,border:'0.5px solid var(--border)',overflow:'hidden'}}>
          <div className="scroll-x">
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Nama','Kategori','Satuan','Stok','Min Stok','Harga Beli','Harga Jual','Aksi'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,color:'var(--t3)',borderBottom:'0.5px solid var(--border)',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>
                {parts.map(p => {
                  const kritis = p.stok<=p.minStok
                  const pct = Math.min(100,Math.round(p.stok/Math.max(p.minStok*2,1)*100))
                  const color = p.stok===0?'#F87171':kritis?'#F59E0B':'#34D399'
                  return <tr key={p.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                    <td style={{padding:'9px 12px',fontSize:12,fontWeight:500}}>{p.nama}</td>
                    <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{p.kategori}</span></td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t3)'}}>{p.satuan}</td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:50,height:4,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:2}} />
                        </div>
                        <span style={{fontSize:12,fontWeight:500,color}}>{p.stok}</span>
                      </div>
                    </td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t3)'}}>{p.minStok}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'var(--t2)'}}>{rp(p.hargaBeli)}</td>
                    <td style={{padding:'9px 12px',fontSize:12,fontWeight:500,color:'#F59E0B'}}>{rp(p.hargaJual)}</td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <Btn variant="success" onClick={()=>tambahStok(p)}>+ Stok</Btn>
                        {role==='ADMIN' && <>
                          <Btn onClick={()=>{setForm({nama:p.nama,kategori:p.kategori,satuan:p.satuan,stok:String(p.stok),minStok:String(p.minStok),hargaBeli:String(p.hargaBeli),hargaJual:String(p.hargaJual),keterangan:p.keterangan||''});setEditId(p.id);setModal('edit')}}>✏️</Btn>
                          <Btn variant="danger" onClick={()=>del(p.id)}>🗑</Btn>
                        </>}
                      </div>
                    </td>
                  </tr>
                })}
                {!parts.length && <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--t3)'}}>Belum ada spare part</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="hide-desktop">
          {parts.map(p => {
            const kritis = p.stok<=p.minStok
            const pct = Math.min(100,Math.round(p.stok/Math.max(p.minStok*2,1)*100))
            const color = p.stok===0?'#F87171':kritis?'#F59E0B':'#34D399'
            return <div key={p.id} style={{background:'var(--bg2)',borderRadius:10,border:'0.5px solid var(--border)',padding:12,marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:500}}>{p.nama}</span>
                <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.07)',color:'var(--t2)'}}>{p.kategori}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--t2)',marginBottom:4}}>
                <span>Stok: <b style={{color}}>{p.stok}</b> {p.satuan}</span>
                <span style={{color:'#F59E0B',fontWeight:600}}>{rp(p.hargaJual)}</span>
              </div>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>Beli: {rp(p.hargaBeli)} · Min: {p.minStok}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <Btn variant="success" onClick={()=>tambahStok(p)}>+ Stok</Btn>
                {role==='ADMIN' && <>
                  <Btn onClick={()=>{setForm({nama:p.nama,kategori:p.kategori,satuan:p.satuan,stok:String(p.stok),minStok:String(p.minStok),hargaBeli:String(p.hargaBeli),hargaJual:String(p.hargaJual),keterangan:p.keterangan||''});setEditId(p.id);setModal('edit')}}>Edit</Btn>
                  <Btn variant="danger" onClick={()=>del(p.id)}>Hapus</Btn>
                </>}
              </div>
            </div>
          })}
          {!parts.length && <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontSize:12}}>Belum ada spare part</div>}
        </div>
      </main>

      {modal && (
        <Modal title={modal==='add'?'Tambah Spare Part':'Edit Spare Part'} onClose={()=>setModal(null)}
          footer={<><Btn onClick={()=>setModal(null)}>Batal</Btn><Btn variant="amber" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</Btn></>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Nama Part *</label><input value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))} /></div>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Kategori</label>
                <select value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                  <option value="MOTOR">Motor</option><option value="MOBIL">Mobil</option><option value="ALAT_BERAT">Alat Berat</option><option value="UMUM">Umum</option>
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Satuan</label>
                <select value={form.satuan} onChange={e=>setForm(f=>({...f,satuan:e.target.value}))}>
                  <option>pcs</option><option>set</option><option>liter</option><option>kg</option><option>meter</option><option>roll</option>
                </select>
              </div>
            </div>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Stok</label><input type="number" value={form.stok} onChange={e=>setForm(f=>({...f,stok:e.target.value}))} /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Min Stok Alert</label><input type="number" value={form.minStok} onChange={e=>setForm(f=>({...f,minStok:e.target.value}))} /></div>
            </div>
            <div className="form-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Harga Beli (Rp)</label><input type="number" value={form.hargaBeli} onChange={e=>setForm(f=>({...f,hargaBeli:e.target.value}))} /></div>
              <div><label style={{fontSize:11,color:'var(--t2)',display:'block',marginBottom:4}}>Harga Jual (Rp)</label><input type="number" value={form.hargaJual} onChange={e=>setForm(f=>({...f,hargaJual:e.target.value}))} /></div>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
