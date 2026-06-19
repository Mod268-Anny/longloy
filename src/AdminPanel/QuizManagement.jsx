import React, { useState, useEffect } from 'react';
import API_URL, { secureLocalFetch } from '../config';

const OPTS = ['A', 'B', 'C', 'D'];
const EMPTY = { question:'', option_a:'', option_b:'', option_c:'', option_d:'', correct_answer:0, points:10 };

export default function QuizManagement({ token }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    secureLocalFetch(`${API_URL}/admin/quiz-questions`, { headers: auth })
      .then(r => r.json()).then(d => setQuestions(Array.isArray(d) ? d : [])).catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.option_a || !form.option_b || !form.option_c || !form.option_d)
      return flash('กรุณากรอกข้อมูลให้ครบ', false);
    setSaving(true);
    const res = await secureLocalFetch(`${API_URL}/admin/quiz-questions`, {
      method: 'POST', headers: auth, body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { flash('เพิ่มคำถามสำเร็จ'); setForm(EMPTY); load(); }
    else flash(data.error || 'เกิดข้อผิดพลาด', false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ลบคำถามนี้?')) return;
    const res = await secureLocalFetch(`${API_URL}/admin/quiz-questions/${id}`, { method: 'DELETE', headers: auth });
    const data = await res.json();
    if (data.success) { flash('ลบสำเร็จ'); load(); }
    else flash(data.error || 'ลบไม่สำเร็จ', false);
  };

  const F = ({ label, field, placeholder, type = 'text' }) => (
    <div>
      <label style={L}>{label}</label>
      <input type={type} value={form[field]} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={INP} onFocus={e => e.target.style.borderColor='#4b8ff4'} onBlur={e => e.target.style.borderColor='#e2e8f0'}/>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
        <div style={{ width:4, height:22, borderRadius:2, background:'linear-gradient(to bottom,#4b8ff4,#2d6fd4)' }}/>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#4b8ff4', letterSpacing:'0.1em', textTransform:'uppercase' }}>เกมตอบคำถาม</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' }}>🧠 จัดการคำถาม Quiz</h2>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background: msg.ok ? '#f0fdf4' : '#fef2f2', border:`1px solid ${msg.ok?'#bbf7d0':'#fca5a5'}`, color: msg.ok ? '#166534' : '#991b1b', fontWeight:600, fontSize:13 }}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Add form ── */}
      <div style={{ background:'#f8fafc', borderRadius:16, padding:24, border:'1px solid #e8edf3', marginBottom:28 }}>
        <p style={{ margin:'0 0 16px', fontWeight:700, fontSize:15, color:'#0f172a' }}>➕ เพิ่มคำถามใหม่</p>
        <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={L}>คำถาม</label>
            <textarea value={form.question} onChange={e => setForm(f=>({...f,question:e.target.value}))}
              placeholder="พิมพ์คำถามที่นี่..." rows={2}
              style={{ ...INP, resize:'vertical', minHeight:64 }}
              onFocus={e=>e.target.style.borderColor='#4b8ff4'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <F label="ตัวเลือก A" field="option_a" placeholder="ตัวเลือก A"/>
            <F label="ตัวเลือก B" field="option_b" placeholder="ตัวเลือก B"/>
            <F label="ตัวเลือก C" field="option_c" placeholder="ตัวเลือก C"/>
            <F label="ตัวเลือก D" field="option_d" placeholder="ตัวเลือก D"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={L}>คำตอบที่ถูกต้อง</label>
              <select value={form.correct_answer} onChange={e=>setForm(f=>({...f,correct_answer:Number(e.target.value)}))}
                style={{ ...INP, cursor:'pointer' }}>
                {OPTS.map((o,i) => <option key={i} value={i}>ตัวเลือก {o}</option>)}
              </select>
            </div>
            <F label="แต้มที่ได้รับ" field="points" type="number" placeholder="10"/>
          </div>
          <button type="submit" disabled={saving}
            style={{ padding:'12px', borderRadius:12, border:'none', background: saving ? '#e2e8f0':'linear-gradient(135deg,#4b8ff4,#2d6fd4)', color: saving?'#94a3b8':'#fff', fontWeight:700, fontSize:14, cursor: saving?'not-allowed':'pointer', boxShadow: saving?'none':'0 4px 14px rgba(75,143,244,0.35)' }}>
            {saving ? '⏳ กำลังบันทึก...' : '➕ เพิ่มคำถาม'}
          </button>
        </form>
      </div>

      {/* ── Question list ── */}
      <div style={{ marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ margin:0, fontWeight:700, fontSize:15, color:'#0f172a' }}>คำถามทั้งหมด ({questions.length})</p>
        <button onClick={load} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer' }}>🔄 รีเฟรช</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}>กำลังโหลด...</div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}>
          <p style={{ fontSize:32 }}>🧠</p><p style={{ fontWeight:600 }}>ยังไม่มีคำถาม</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {questions.map((q, idx) => (
            <div key={q.question_id} style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf3', padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ background:'#edf3ff', color:'#4b8ff4', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:999 }}>ข้อ {idx+1}</span>
                    <span style={{ background:'#fff0db', color:'#8d4d11', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:999 }}>⭐ {q.points} แต้ม</span>
                  </div>
                  <p style={{ margin:'0 0 10px', fontWeight:700, fontSize:14, color:'#0f172a', lineHeight:1.5 }}>{q.question}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                    {[q.option_a, q.option_b, q.option_c, q.option_d].map((opt, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background: q.correct_answer === i ? '#f0fdf4' : '#f8fafc', border:`1px solid ${q.correct_answer===i?'#bbf7d0':'#f1f5f9'}` }}>
                        <span style={{ fontWeight:800, fontSize:12, color: q.correct_answer===i?'#16a34a':'#94a3b8', minWidth:16 }}>{OPTS[i]}.</span>
                        <span style={{ fontSize:13, color: q.correct_answer===i?'#166534':'#475569', fontWeight: q.correct_answer===i?600:400 }}>{opt}</span>
                        {q.correct_answer === i && <span style={{ marginLeft:'auto', fontSize:12 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(q.question_id)}
                  style={{ flexShrink:0, width:32, height:32, borderRadius:8, border:'1px solid #fca5a5', background:'#fff5f5', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const L = { fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 };
const INP = { width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', transition:'border-color 0.15s' };
