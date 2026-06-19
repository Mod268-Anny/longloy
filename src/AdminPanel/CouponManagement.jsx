import React, { useState, useEffect } from 'react';
import API_URL, { secureLocalFetch } from '../config';

const EMPTY = {
  name: '', description: '', points_required: '', coupon_code: '',
  discount_amount: '', max_redemptions: '', expiration_date: '', is_active: true,
};

function Badge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: active ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.1)',
      color: active ? '#16a34a' : '#64748b',
      border: `1px solid ${active ? 'rgba(34,197,94,0.3)' : '#e2e8f0'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#22c55e' : '#94a3b8', display: 'inline-block' }} />
      {active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
    </span>
  );
}

function InputRow({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#0f172a', background: '#fff',
};

export default function CouponManagement({ token }) {
  const [rewards,   setRewards]   = useState([]);
  const [usage,     setUsage]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState({ text: '', ok: true });
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [tab,       setTab]       = useState('rewards'); // 'rewards' | 'usage'
  const [deleting,  setDeleting]  = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    Promise.all([
      secureLocalFetch(`${API_URL}/admin/rewards`,      { headers }).then(r => r.json()),
      secureLocalFetch(`${API_URL}/admin/coupon-usage`, { headers }).then(r => r.json()),
    ]).then(([r, u]) => {
      setRewards(Array.isArray(r) ? r : []);
      setUsage(Array.isArray(u) ? u : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 3000);
  };

  const openNew = () => {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      name: r.name || '',
      description: r.description || '',
      points_required: r.points_required ?? '',
      coupon_code: r.coupon_code || '',
      discount_amount: r.discount_amount ?? '',
      max_redemptions: r.max_redemptions ?? '',
      expiration_date: r.expiration_date ? r.expiration_date.slice(0, 10) : '',
      is_active: !!r.is_active,
    });
    setEditId(r.reward_id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name || !form.points_required || !form.coupon_code) {
      flash('กรุณากรอกชื่อ, แต้มที่ใช้, และรหัสคูปอง', false);
      return;
    }
    setSaving(true);
    try {
      const url    = editId ? `${API_URL}/admin/rewards/${editId}` : `${API_URL}/admin/rewards`;
      const method = editId ? 'PUT' : 'POST';
      const body   = {
        ...form,
        points_required: Number(form.points_required),
        discount_amount: form.discount_amount !== '' ? Number(form.discount_amount) : 0,
        max_redemptions: form.max_redemptions !== '' ? Number(form.max_redemptions) : null,
        expiration_date: form.expiration_date || null,
      };
      const res = await secureLocalFetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); flash(d.error || 'เกิดข้อผิดพลาด', false); }
      else { flash(editId ? 'อัปเดตสำเร็จ' : 'เพิ่มคูปองสำเร็จ'); closeForm(); load(); }
    } catch { flash('เกิดข้อผิดพลาด', false); }
    setSaving(false);
  };

  const remove = async (id) => {
    setDeleting(id);
    try {
      await secureLocalFetch(`${API_URL}/admin/rewards/${id}`, { method: 'DELETE', headers });
      flash('ลบสำเร็จ');
      load();
    } catch { flash('ลบไม่สำเร็จ', false); }
    setDeleting(null);
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: 60, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#0f172a' }}>🎟️ จัดการคูปอง / รางวัล</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>คูปองทั้งหมด {rewards.length} รายการ — ใช้แล้ว {usage.length} ครั้ง</p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4b8ff4,#2d6fd4)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 12px rgba(75,143,244,0.35)' }}>
          + เพิ่มคูปองใหม่
        </button>
      </div>

      {/* Flash message */}
      {msg.text && (
        <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fff0e8', color: msg.ok ? '#166534' : '#8d4d11', border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(141,77,17,0.2)'}` }}>
          {msg.ok ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[{ k: 'rewards', label: '🎟️ คูปองทั้งหมด' }, { k: 'usage', label: '📋 ประวัติการใช้' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: '7px 16px', borderRadius: 8, border: tab === t.k ? 'none' : '1px solid #e2e8f0', background: tab === t.k ? '#4b8ff4' : '#fff', color: tab === t.k ? '#fff' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Add/Edit form modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{editId ? '✏️ แก้ไขคูปอง' : '➕ เพิ่มคูปองใหม่'}</h3>
              <button onClick={closeForm} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InputRow label="ชื่อรางวัล" required>
                <input style={inp} value={form.name} onChange={f('name')} placeholder="เช่น คูปองส่วนลด 50 บาท" />
              </InputRow>
              <InputRow label="คำอธิบาย">
                <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={f('description')} placeholder="รายละเอียดเพิ่มเติม..." />
              </InputRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputRow label="แต้มที่ใช้แลก" required>
                  <input style={inp} type="number" min="1" value={form.points_required} onChange={f('points_required')} placeholder="100" />
                </InputRow>
                <InputRow label="ส่วนลด (บาท)">
                  <input style={inp} type="number" min="0" value={form.discount_amount} onChange={f('discount_amount')} placeholder="50" />
                </InputRow>
              </div>
              <InputRow label="รหัสคูปอง" required>
                <input style={inp} value={form.coupon_code} onChange={f('coupon_code')} placeholder="LONGLOY50" />
              </InputRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputRow label="จำนวนสิทธิ์สูงสุด">
                  <input style={inp} type="number" min="1" value={form.max_redemptions} onChange={f('max_redemptions')} placeholder="ไม่จำกัด" />
                </InputRow>
                <InputRow label="วันหมดอายุ">
                  <input style={inp} type="date" value={form.expiration_date} onChange={f('expiration_date')} />
                </InputRow>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={form.is_active} onChange={f('is_active')} style={{ width: 16, height: 16, accentColor: '#4b8ff4' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>เปิดใช้งาน</span>
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeForm} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#4b8ff4,#2d6fd4)', color: saving ? '#94a3b8' : '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', boxShadow: saving ? 'none' : '0 3px 12px rgba(75,143,244,0.32)' }}>
                  {saving ? '⏳ กำลังบันทึก...' : (editId ? 'บันทึกการแก้ไข' : 'เพิ่มคูปอง')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rewards tab ── */}
      {tab === 'rewards' && (
        rewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <p style={{ fontSize: 36 }}>🎟️</p>
            <p style={{ fontWeight: 600 }}>ยังไม่มีคูปอง — กด "เพิ่มคูปองใหม่" เพื่อเริ่ม</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rewards.map(r => (
              <div key={r.reward_id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{r.name}</span>
                    <Badge active={!!r.is_active} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '2px 10px', borderRadius: 999 }}>
                      🎟️ {r.coupon_code}
                    </span>
                    <span style={{ fontSize: 12, color: '#4b8ff4', fontWeight: 700 }}>⭐ {r.points_required} แต้ม</span>
                    {r.discount_amount > 0 && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>-฿{r.discount_amount}</span>}
                    <span style={{ fontSize: 12, color: '#64748b' }}>ใช้แล้ว {r.total_redeemed}/{r.max_redemptions ?? '∞'}</span>
                    {r.expiration_date && <span style={{ fontSize: 12, color: '#94a3b8' }}>หมดอายุ {new Date(r.expiration_date).toLocaleDateString('th-TH')}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => openEdit(r)} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #4b8ff4', background: '#fff', color: '#4b8ff4', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>แก้ไข</button>
                  <button
                    onClick={() => { if (window.confirm(`ยืนยันลบคูปอง "${r.name}"?`)) remove(r.reward_id); }}
                    disabled={deleting === r.reward_id}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: deleting === r.reward_id ? 0.6 : 1 }}>
                    {deleting === r.reward_id ? '...' : 'ลบ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Usage tab ── */}
      {tab === 'usage' && (
        usage.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <p style={{ fontSize: 36 }}>📋</p>
            <p style={{ fontWeight: 600 }}>ยังไม่มีการใช้คูปอง</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['#', 'รหัสคูปอง', 'ชื่อรางวัล', 'ผู้ใช้', 'ส่วนลด', 'หมายเลขออเดอร์'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={u.usage_id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: '#fff', fontWeight: 800, fontSize: 11, padding: '2px 9px', borderRadius: 999 }}>{u.coupon_code}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>{u.reward_name || '-'}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{u.first_name} {u.last_name}</td>
                    <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>-฿{u.discount_amount || 0}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>#{u.order_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
