import React, { useState, useEffect, useMemo } from 'react';
import API_URL, { secureLocalFetch } from '../config';

/* ── Toggle Switch ──────────────────────────────────────────── */
function Toggle({ active, onChange, size = 'md' }) {
  const w = size === 'sm' ? 40 : 48;
  const h = size === 'sm' ? 22 : 26;
  const d = size === 'sm' ? 16 : 20;
  const t = size === 'sm' ? 3 : 3;
  return (
    <button
      onClick={onChange}
      title={active ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        width: w, height: h, borderRadius: h, border: 'none', cursor: 'pointer',
        background: active ? '#22c55e' : '#cbd5e1',
        transition: 'background 0.25s ease',
        boxShadow: active ? '0 0 0 3px rgba(34,197,94,0.2)' : '0 0 0 2px rgba(0,0,0,0.06)',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: t, left: active ? w - d - t : t,
        width: d, height: d, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
      }} />
    </button>
  );
}

const OPTS = ['A', 'B', 'C', 'D'];
const PAGE_SIZE = 10;
const QUEST_TYPES = {
  buy_count:     { label:'จำนวนคำสั่งซื้อ',    unit:'ครั้ง' },
  buy_amount:    { label:'ยอดซื้อสะสม',         unit:'บาท'  },
  visit_shops:   { label:'จำนวนร้านค้าที่ซื้อ', unit:'ร้าน' },
  buy_in_market: { label:'ซื้อในตลาดน้ำ',        unit:'ครั้ง' },
};
const EMPTY_Q    = { question:'', option_a:'', option_b:'', option_c:'', option_d:'', correct_answer:0, points:10 };
const EMPTY_QUEST = { name:'', description:'', quest_type:'buy_count', target_value:1, points_reward:50, icon:'🎯', market_id:'' };

/* ── Pagination component ─────────────────────────────────────── */
function Pagination({ total, page, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:20 }}>
      <button onClick={()=>onChange(page-1)} disabled={page===1}
        style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:page===1?'not-allowed':'pointer',color:page===1?'#cbd5e1':'#475569',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>

      {Array.from({length:pages},(_,i)=>i+1).map(p=>{
        const isActive = p===page;
        // always show first, last, and ±1 around current; others = dot
        const show = p===1||p===pages||Math.abs(p-page)<=1;
        const dotBefore = p===2&&page>3;
        const dotAfter  = p===pages-1&&page<pages-2;
        return (
          <React.Fragment key={p}>
            {dotBefore && <span style={{color:'#cbd5e1',fontWeight:700,fontSize:16,lineHeight:1}}>•••</span>}
            {show && (
              <button onClick={()=>onChange(p)}
                style={{ width:32,height:32,borderRadius:8,border:isActive?'none':'1px solid #e2e8f0',background:isActive?'#4b8ff4':'#fff',color:isActive?'#fff':'#475569',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:isActive?'0 3px 10px rgba(75,143,244,0.35)':'none',transition:'all 0.15s' }}>
                {p}
              </button>
            )}
            {dotAfter && <span style={{color:'#cbd5e1',fontWeight:700,fontSize:16,lineHeight:1}}>•••</span>}
          </React.Fragment>
        );
      })}

      <button onClick={()=>onChange(page+1)} disabled={page===pages}
        style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:page===pages?'not-allowed':'pointer',color:page===pages?'#cbd5e1':'#475569',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>›</button>
    </div>
  );
}

/* ══════════════════════════════════════════ Main Component ══ */
export default function GameContent({ token }) {
  const [questions,    setQuestions]    = useState([]);
  const [quests,       setQuests]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [section,      setSection]      = useState('quests');
  const [showForm,     setShowForm]     = useState(false);
  const [qForm,        setQForm]        = useState(EMPTY_Q);
  const [questForm,    setQuestForm]    = useState(EMPTY_QUEST);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState(null);
  const [gameEnabled,  setGameEnabled]  = useState(true);
  const [gameToggling, setGameToggling] = useState(false);
  const [marketsList,  setMarketsList]  = useState([]);

  // Search
  const [qSearch,     setQSearch]     = useState('');
  const [questSearch, setQuestSearch] = useState('');

  // Pagination
  const [qPage,     setQPage]     = useState(1);
  const [questPage, setQuestPage] = useState(1);

  const auth = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' };

  const loadAll = async () => {
    setLoading(true);
    const [qRes, questRes, settingsRes, marketsRes] = await Promise.all([
      secureLocalFetch(`${API_URL}/admin/quiz-questions`, { headers:auth }).then(r=>r.ok?r.json():[]).catch(()=>[]),
      secureLocalFetch(`${API_URL}/admin/quests`, { headers:auth })
        .then(r=>r.ok?r.json():null).catch(()=>null)
        .then(d=>d ?? secureLocalFetch(`${API_URL}/quests`,{headers:auth}).then(r=>r.ok?r.json():[]).catch(()=>[])),
      secureLocalFetch(`${API_URL}/settings/game`, { headers:auth }).then(r=>r.ok?r.json():null).catch(()=>null),
      secureLocalFetch(`${API_URL}/floating-markets/all`, { headers:auth }).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]);
    setQuestions(Array.isArray(qRes)?qRes:[]);
    setQuests(Array.isArray(questRes)?questRes:[]);
    if (settingsRes) setGameEnabled(settingsRes.game_enabled);
    setMarketsList(Array.isArray(marketsRes)?marketsRes:[]);
    setLoading(false);
  };

  const toggleGame = async () => {
    setGameToggling(true);
    const next = !gameEnabled;
    const res = await secureLocalFetch(`${API_URL}/admin/settings/game`, {
      method:'PUT', headers:auth, body:JSON.stringify({ game_enabled: next }),
    }).catch(()=>null);
    const data = res ? await res.json().catch(()=>null) : null;
    if (data?.success) {
      setGameEnabled(next);
      flash(next ? '🎮 เปิดเกมสำเร็จ — ผู้ใช้สามารถเล่นได้แล้ว' : '🔒 ปิดเกมสำเร็จ — ผู้ใช้จะไม่สามารถเล่นได้', true);
    } else {
      flash('เกิดข้อผิดพลาดในการเปลี่ยนสถานะเกม', false);
    }
    setGameToggling(false);
  };

  useEffect(()=>{ loadAll(); },[]);

  const flash = (text,ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),3000); };

  /* ── filtered + paginated data ── */
  const filteredQ = useMemo(()=>
    questions.filter(q => q.question?.toLowerCase().includes(qSearch.toLowerCase()) ||
      [q.option_a,q.option_b,q.option_c,q.option_d].some(o=>o?.toLowerCase().includes(qSearch.toLowerCase())))
  ,[questions,qSearch]);

  const filteredQuests = useMemo(()=>
    quests.filter(q => q.name?.toLowerCase().includes(questSearch.toLowerCase()) ||
      q.description?.toLowerCase().includes(questSearch.toLowerCase()))
  ,[quests,questSearch]);

  const qPaged     = filteredQ.slice((qPage-1)*PAGE_SIZE, qPage*PAGE_SIZE);
  const questPaged = filteredQuests.slice((questPage-1)*PAGE_SIZE, questPage*PAGE_SIZE);

  /* ── Quiz CRUD ── */
  const addQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.question.trim()||!qForm.option_a||!qForm.option_b||!qForm.option_c||!qForm.option_d)
      return flash('กรุณากรอกข้อมูลให้ครบ',false);
    setSaving(true);
    const res  = await secureLocalFetch(`${API_URL}/admin/quiz-questions`,{method:'POST',headers:auth,body:JSON.stringify(qForm)});
    const data = await res.json();
    setSaving(false);
    if (data.success) { flash('เพิ่มคำถามสำเร็จ'); setQForm(EMPTY_Q); setShowForm(false); loadAll(); }
    else flash(data.error||'เกิดข้อผิดพลาด',false);
  };

  const toggleQuestion = async (q) => {
    await secureLocalFetch(`${API_URL}/admin/quiz-questions/${q.question_id}`,{
      method:'PUT',headers:auth,body:JSON.stringify({is_active:q.is_active?0:1}),
    });
    loadAll();
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('ลบคำถามนี้?')) return;
    const res = await secureLocalFetch(`${API_URL}/admin/quiz-questions/${id}`,{method:'DELETE',headers:auth});
    if ((await res.json()).success) { flash('ลบสำเร็จ'); loadAll(); }
    else flash('ลบไม่สำเร็จ',false);
  };

  /* ── Quest CRUD ── */
  const addQuest = async (e) => {
    e.preventDefault();
    if (!questForm.name.trim()||!questForm.target_value) return flash('กรุณากรอกข้อมูลให้ครบ',false);
    if (questForm.quest_type === 'buy_in_market' && !questForm.market_id) return flash('กรุณาเลือกตลาดน้ำ',false);
    setSaving(true);
    const res  = await secureLocalFetch(`${API_URL}/admin/quests`,{method:'POST',headers:auth,body:JSON.stringify({
      ...questForm,
      market_id: questForm.market_id||null,
    })});
    const data = await res.json();
    setSaving(false);
    if (data.success) { flash('เพิ่มเควสสำเร็จ'); setQuestForm(EMPTY_QUEST); setShowForm(false); loadAll(); }
    else flash(data.error||'เกิดข้อผิดพลาด',false);
  };

  const toggleQuest = async (q) => {
    await secureLocalFetch(`${API_URL}/admin/quests/${q.quest_id}`,{
      method:'PUT',headers:auth,body:JSON.stringify({...q,is_active:q.is_active?0:1}),
    });
    loadAll();
  };

  const deleteQuest = async (id) => {
    if (!window.confirm('ลบเควสนี้?')) return;
    const res = await secureLocalFetch(`${API_URL}/admin/quests/${id}`,{method:'DELETE',headers:auth});
    if ((await res.json()).success) { flash('ลบสำเร็จ'); loadAll(); }
    else flash('ลบไม่สำเร็จ',false);
  };

  /* ══════════════════════════════════════ RENDER ══════════════ */
  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div>
          <p style={{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#4b8ff4',letterSpacing:'0.1em',textTransform:'uppercase'}}>เนื้อหาเกม</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:'#0f172a'}}>🎮 จัดการเนื้อหาเกม</h2>
        </div>
        <button onClick={loadAll} style={{padding:'8px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer'}}>
          🔄 รีเฟรช
        </button>
      </div>

      {/* ── Master Game Toggle ──────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px', borderRadius:16, marginBottom:20,
        background: gameEnabled
          ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
          : 'linear-gradient(135deg,#fef2f2,#fee2e2)',
        border: `2px solid ${gameEnabled ? '#86efac' : '#fca5a5'}`,
        boxShadow: gameEnabled
          ? '0 4px 16px rgba(34,197,94,0.15)'
          : '0 4px 16px rgba(239,68,68,0.12)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{
            width:48, height:48, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
            background: gameEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
          }}>
            {gameEnabled ? '🎮' : '🔒'}
          </div>
          <div>
            <p style={{margin:0,fontSize:15,fontWeight:800,color: gameEnabled ? '#15803d' : '#b91c1c'}}>
              {gameEnabled ? 'เกมเปิดใช้งานอยู่' : 'เกมถูกปิดอยู่'}
            </p>
            <p style={{margin:'2px 0 0',fontSize:12,color: gameEnabled ? '#166534' : '#991b1b'}}>
              {gameEnabled ? 'ผู้ใช้สามารถเล่นเกม Quiz และทำเควสได้' : 'ผู้ใช้ไม่สามารถเข้าถึงเกมได้'}
            </p>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
          <span style={{
            fontSize:13, fontWeight:700,
            color: gameEnabled ? '#15803d' : '#b91c1c',
          }}>
            {gameEnabled ? 'เปิด' : 'ปิด'}
          </span>
          <button
            onClick={toggleGame}
            disabled={gameToggling}
            title={gameEnabled ? 'คลิกเพื่อปิดเกม' : 'คลิกเพื่อเปิดเกม'}
            style={{
              position:'relative', display:'inline-flex', alignItems:'center',
              width:64, height:34, borderRadius:34, border:'none', cursor: gameToggling ? 'wait' : 'pointer',
              background: gameEnabled ? '#22c55e' : '#cbd5e1',
              transition:'background 0.3s ease',
              boxShadow: gameEnabled ? '0 0 0 4px rgba(34,197,94,0.25)' : '0 0 0 3px rgba(0,0,0,0.07)',
              padding:0, flexShrink:0,
              opacity: gameToggling ? 0.7 : 1,
            }}
          >
            <span style={{
              position:'absolute',
              top:4, left: gameEnabled ? 34 : 4,
              width:26, height:26, borderRadius:'50%',
              background:'#fff',
              boxShadow:'0 2px 8px rgba(0,0,0,0.22)',
              transition:'left 0.3s cubic-bezier(0.4,0,0.2,1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12,
            }}>
              {gameToggling ? '⏳' : gameEnabled ? '✓' : '✕'}
            </span>
          </button>
        </div>
      </div>

      {msg && (
        <div style={{marginBottom:16,padding:'10px 16px',borderRadius:10,background:msg.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${msg.ok?'#bbf7d0':'#fca5a5'}`,color:msg.ok?'#166534':'#991b1b',fontWeight:600,fontSize:13}}>
          {msg.ok?'✅':'❌'} {msg.text}
        </div>
      )}

      {/* Section + Add button */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {[
          {key:'quests', label:`🛍️ เควสสั่งซื้อ`, count: quests.length},
          {key:'quiz',   label:`🧠 คำถาม Quiz`,   count: questions.length},
        ].map(s=>(
          <button key={s.key} onClick={()=>{setSection(s.key);setShowForm(false);}}
            style={{padding:'9px 18px',borderRadius:10,border:'none',fontWeight:700,fontSize:14,cursor:'pointer',transition:'all 0.15s',
              background:section===s.key?'#4b8ff4':'#f1f5f9',
              color:section===s.key?'#fff':'#475569',
              boxShadow:section===s.key?'0 4px 14px rgba(75,143,244,0.35)':'none'}}>
            {s.label} <span style={{opacity:0.75,fontWeight:500,fontSize:12}}>({s.count})</span>
          </button>
        ))}
        <button onClick={()=>setShowForm(v=>!v)}
          style={{marginLeft:'auto',padding:'9px 18px',borderRadius:10,border:'none',fontWeight:700,fontSize:14,cursor:'pointer',
            background:showForm?'#e2e8f0':'linear-gradient(135deg,#8d4d11,#6b3a0d)',
            color:showForm?'#475569':'#fff',
            boxShadow:showForm?'none':'0 4px 14px rgba(141,77,17,0.28)'}}>
          {showForm?'✕ ปิด':`➕ เพิ่ม${section==='quiz'?'คำถาม':'เควส'}`}
        </button>
      </div>

      {/* ── Add form ── */}
      {showForm && section==='quiz' && (
        <div style={{background:'#f8fafc',borderRadius:16,padding:20,border:'1px solid #e8edf3',marginBottom:16}}>
          <form onSubmit={addQuestion} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div>
              <label style={L}>คำถาม</label>
              <textarea value={qForm.question} onChange={e=>setQForm(f=>({...f,question:e.target.value}))} rows={2} placeholder="พิมพ์คำถาม..."
                style={{...INP,resize:'vertical',minHeight:56}} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['option_a','option_b','option_c','option_d'].map((f,i)=>(
                <div key={f}>
                  <label style={L}>ตัวเลือก {OPTS[i]}</label>
                  <input value={qForm[f]} onChange={e=>setQForm(p=>({...p,[f]:e.target.value}))} placeholder={`ตัวเลือก ${OPTS[i]}`}
                    style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <label style={L}>คำตอบที่ถูก</label>
                <select value={qForm.correct_answer} onChange={e=>setQForm(f=>({...f,correct_answer:Number(e.target.value)}))} style={{...INP,cursor:'pointer'}}>
                  {OPTS.map((o,i)=><option key={i} value={i}>ตัวเลือก {o}</option>)}
                </select>
              </div>
              <div>
                <label style={L}>แต้มที่ได้</label>
                <input type="number" min={1} value={qForm.points} onChange={e=>setQForm(f=>({...f,points:Number(e.target.value)}))}
                  style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
            </div>
            <button type="submit" disabled={saving} style={SAVEBTN(saving,'#4b8ff4')}>
              {saving?'⏳ กำลังบันทึก...':'➕ เพิ่มคำถาม'}
            </button>
          </form>
        </div>
      )}

      {showForm && section==='quests' && (
        <div style={{background:'#f8fafc',borderRadius:16,padding:20,border:'1px solid #e8edf3',marginBottom:16}}>
          <form onSubmit={addQuest} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:8}}>
              <div>
                <label style={L}>ชื่อเควส</label>
                <input value={questForm.name} onChange={e=>setQuestForm(f=>({...f,name:e.target.value}))} placeholder="ชื่อเควส"
                  style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
              <div>
                <label style={L}>ไอคอน</label>
                <input value={questForm.icon} onChange={e=>setQuestForm(f=>({...f,icon:e.target.value}))} placeholder="🎯"
                  style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
            </div>
            <div>
              <label style={L}>คำอธิบาย</label>
              <input value={questForm.description} onChange={e=>setQuestForm(f=>({...f,description:e.target.value}))} placeholder="รายละเอียด"
                style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <div>
                <label style={L}>ประเภท</label>
                <select value={questForm.quest_type} onChange={e=>setQuestForm(f=>({...f,quest_type:e.target.value,market_id:''}))} style={{...INP,cursor:'pointer'}}>
                  {Object.entries(QUEST_TYPES).map(([v,t])=><option key={v} value={v}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={L}>เป้าหมาย ({QUEST_TYPES[questForm.quest_type]?.unit})</label>
                <input type="number" min={1} value={questForm.target_value} onChange={e=>setQuestForm(f=>({...f,target_value:Number(e.target.value)}))}
                  style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
              <div>
                <label style={L}>แต้มรางวัล</label>
                <input type="number" min={1} value={questForm.points_reward} onChange={e=>setQuestForm(f=>({...f,points_reward:Number(e.target.value)}))}
                  style={INP} onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
            </div>

            {/* Market selector — shown only for buy_in_market */}
            {questForm.quest_type === 'buy_in_market' && (
              <div style={{background:'#f0fdf4',borderRadius:12,padding:'12px 14px',border:'1px solid #86efac'}}>
                <label style={{...L,color:'#166534'}}>🌊 เลือกตลาดน้ำเป้าหมาย <span style={{color:'#ef4444'}}>*</span></label>
                <select value={questForm.market_id} onChange={e=>setQuestForm(f=>({...f,market_id:e.target.value}))} style={{...INP,cursor:'pointer',borderColor:'#86efac'}}>
                  <option value=''>— เลือกตลาดน้ำ —</option>
                  {marketsList.map(m=>(
                    <option key={m.market_id} value={m.market_id}>{m.name}</option>
                  ))}
                </select>
                {marketsList.length === 0 && (
                  <p style={{margin:'6px 0 0',fontSize:11,color:'#64748b'}}>ไม่พบข้อมูลตลาดน้ำ</p>
                )}
              </div>
            )}

            <button type="submit" disabled={saving} style={SAVEBTN(saving,'#8d4d11')}>
              {saving?'⏳ กำลังบันทึก...':'➕ เพิ่มเควส'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'#94a3b8'}}>
          <div style={{fontSize:32,marginBottom:8}}>⏳</div>
          <p style={{fontWeight:600,margin:0}}>กำลังโหลดข้อมูล...</p>
        </div>
      ) : section==='quiz' ? (
        <>
          {/* Search + summary */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94a3b8',pointerEvents:'none'}}>🔍</span>
              <input value={qSearch} onChange={e=>{setQSearch(e.target.value);setQPage(1);}}
                placeholder="ค้นหาคำถามหรือตัวเลือก..."
                style={{...INP,paddingLeft:36,borderRadius:12}}
                onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <span style={{fontSize:13,color:'#64748b',whiteSpace:'nowrap'}}>
              พบ <strong>{filteredQ.length}</strong> / {questions.length} คำถาม
              {' '}· เปิดใช้ <strong style={{color:'#22c55e'}}>{questions.filter(q=>q.is_active).length}</strong>
              {' '}· ปิด <strong style={{color:'#ef4444'}}>{questions.filter(q=>!q.is_active).length}</strong>
            </span>
          </div>

          {filteredQ.length===0 ? <Empty icon="🧠" text="ไม่พบคำถาม"/> : (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {qPaged.map((q,idx)=>(
                  <div key={q.question_id} style={{background:'#fff',borderRadius:14,border:`1.5px solid ${q.is_active?'#e8edf3':'#f1f5f9'}`,padding:'14px 18px',opacity:q.is_active?1:0.55,transition:'all 0.2s'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8,alignItems:'center'}}>
                          <span style={{background:'#f1f5f9',color:'#64748b',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999}}>
                            #{q.question_id}
                          </span>
                          <span style={{background:'#fff0db',color:'#8d4d11',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999}}>⭐ {q.points}</span>
                          <span style={{background:q.is_active?'#f0fdf4':'#fef2f2',color:q.is_active?'#16a34a':'#ef4444',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999}}>
                            {q.is_active?'● เปิด':'● ปิด'}
                          </span>
                        </div>
                        <p style={{margin:'0 0 10px',fontWeight:700,fontSize:14,color:'#0f172a',lineHeight:1.6}}>{q.question}</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                          {[q.option_a,q.option_b,q.option_c,q.option_d].map((opt,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,
                              background:q.correct_answer===i?'#f0fdf4':'#f8fafc',
                              border:`1px solid ${q.correct_answer===i?'#bbf7d0':'#f1f5f9'}`}}>
                              <span style={{width:18,height:18,borderRadius:'50%',background:q.correct_answer===i?'#22c55e':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:q.correct_answer===i?'#fff':'#94a3b8',flexShrink:0}}>{OPTS[i]}</span>
                              <span style={{fontSize:12,color:q.correct_answer===i?'#166534':'#475569',fontWeight:q.correct_answer===i?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                          <Toggle active={!!q.is_active} onChange={()=>toggleQuestion(q)}/>
                          <span style={{fontSize:10,fontWeight:700,color:q.is_active?'#16a34a':'#94a3b8'}}>
                            {q.is_active?'เปิด':'ปิด'}
                          </span>
                        </div>
                        <button onClick={()=>deleteQuestion(q.question_id)}
                          style={{width:36,height:32,borderRadius:8,border:'1px solid #fca5a5',background:'#fff5f5',color:'#ef4444',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination total={filteredQ.length} page={qPage} onChange={setQPage}/>
            </>
          )}
        </>
      ) : (
        <>
          {/* Search + summary */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94a3b8',pointerEvents:'none'}}>🔍</span>
              <input value={questSearch} onChange={e=>{setQuestSearch(e.target.value);setQuestPage(1);}}
                placeholder="ค้นหาชื่อหรือรายละเอียดเควส..."
                style={{...INP,paddingLeft:36,borderRadius:12}}
                onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <span style={{fontSize:13,color:'#64748b',whiteSpace:'nowrap'}}>
              พบ <strong>{filteredQuests.length}</strong> / {quests.length} เควส
              {' '}· เปิด <strong style={{color:'#22c55e'}}>{quests.filter(q=>q.is_active).length}</strong>
              {' '}· ปิด <strong style={{color:'#ef4444'}}>{quests.filter(q=>!q.is_active).length}</strong>
            </span>
          </div>

          {filteredQuests.length===0 ? <Empty icon="🛍️" text="ไม่พบเควส"/> : (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {questPaged.map(q=>{
                  const t = QUEST_TYPES[q.quest_type]||{label:q.quest_type,unit:''};
                  const marketName = q.quest_type === 'buy_in_market' && q.market_id
                    ? marketsList.find(m=>Number(m.market_id)===Number(q.market_id))?.name || `ตลาด #${q.market_id}`
                    : null;
                  return (
                    <div key={q.quest_id} style={{background:'#fff',borderRadius:12,border:`1.5px solid ${q.is_active?'#e8edf3':'#f1f5f9'}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,opacity:q.is_active?1:0.55,transition:'all 0.2s'}}>
                      <div style={{fontSize:24,flexShrink:0,width:36,textAlign:'center'}}>{q.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}>
                          <span style={{fontSize:11,color:'#94a3b8',fontWeight:700}}>#{q.quest_id}</span>
                          <span style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{q.name}</span>
                          <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:5,background:'#edf3ff',color:'#4b8ff4'}}>{t.label}</span>
                          <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:5,background:'#fff0db',color:'#8d4d11'}}>⭐{q.points_reward}</span>
                          <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:5,background:'#f8fafc',color:'#64748b'}}>🎯{q.target_value}{t.unit}</span>
                          {marketName && (
                            <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:5,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac'}}>
                              🌊 {marketName}
                            </span>
                          )}
                        </div>
                        {q.description && <p style={{margin:0,fontSize:12,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.description}</p>}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                          <Toggle active={!!q.is_active} onChange={()=>toggleQuest(q)}/>
                          <span style={{fontSize:10,fontWeight:700,color:q.is_active?'#16a34a':'#94a3b8'}}>
                            {q.is_active?'เปิด':'ปิด'}
                          </span>
                        </div>
                        <button onClick={()=>deleteQuest(q.quest_id)}
                          style={{width:32,height:32,borderRadius:8,border:'1px solid #fca5a5',background:'#fff5f5',color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination total={filteredQuests.length} page={questPage} onChange={setQuestPage}/>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Empty({icon,text}) {
  return (
    <div style={{textAlign:'center',padding:'48px 0',color:'#94a3b8'}}>
      <div style={{fontSize:36,marginBottom:8}}>{icon}</div>
      <p style={{fontWeight:600,margin:0}}>{text}</p>
    </div>
  );
}

const L = { fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:4 };
const INP = { width:'100%',boxSizing:'border-box',padding:'9px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,fontFamily:'inherit',outline:'none',background:'#fff',transition:'border-color 0.15s' };
const SAVEBTN = (saving,color) => ({
  padding:'11px',borderRadius:12,border:'none',
  background:saving?'#e2e8f0':`${color}`,
  color:saving?'#94a3b8':'#fff',fontWeight:700,fontSize:14,
  cursor:saving?'not-allowed':'pointer',
  boxShadow:saving?'none':`0 4px 14px ${color}50`,
});
