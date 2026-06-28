// ============================================================
// AdminPanel/UserManagement.jsx — จัดการผู้ใช้งานระบบ
//
// หน้าที่: แสดงรายชื่อผู้ใช้ทั้งหมด + ค้นหา + แก้ไขสิทธิ์ + แบน
//
// ฟีเจอร์:
//   - ค้นหาผู้ใช้ตามชื่อ / อีเมล / บทบาท
//   - เปลี่ยน role (Tourist / Entrepreneur / Admin)
//   - แบน / ปลดแบนผู้ใช้
//   - ดูประวัติ activity ของผู้ใช้ (ActivityHistory modal)
//
// API: GET /admin/users, PUT /admin/users/:id/ban, PUT /admin/users/:id/role
// ============================================================
import React, { useState, useEffect } from 'react';
import API_URL, { secureLocalFetch } from '../config';
import ActivityHistory from './ActivityHistory';

/* ─── Role badge ─────────────────────────────────────────────────── */
const ROLE_STYLE = {
  Admin:         { bg: "#fff0e8", color: "#6b3a0d", border: "#ffe8d4",  label: "🛡️ Admin" },
  Entrepreneur:  { bg: "#fff8f0", color: "#5c2c08", border: "#d4880a",  label: "🏪 ผู้ประกอบการ" },
  Tourist:       { bg: "#edf3ff", color: "#1a3a6e", border: "#b8d4fb",  label: "🧳 นักท่องเที่ยว" },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: role };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>{s.label}</span>;
}

/* ─── Simple modal ───────────────────────────────────────────────── */
function Modal({ show, onClose, title, children, footer }) {
  if (!show) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, background: "#fff", borderRadius: 20, width: "min(96vw, 520px)", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
        {footer && <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div>}
      </div>
    </>
  );
}

/* ─── Form field ─────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s" };

/* ═══════════════════════════════════════════════════════════════ */
function UserManagement({ token }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showPointsModal,   setShowPointsModal]   = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData,     setEditData]     = useState({});
  const [pointsData,   setPointsData]   = useState({ points: 0, reason: '' });
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { fetchUsers(); }, [roleFilter, statusFilter]);

  const fetchUsers = () => {
    setLoading(true); setError('');
    let url = `${API_URL}/admin/users`;
    const p = new URLSearchParams();
    if (roleFilter)    p.append('role', roleFilter);
    if (statusFilter)  p.append('is_active', statusFilter);
    if (search)        p.append('search', search);
    if (p.toString())  url += '?' + p.toString();

    secureLocalFetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(data => { if (data.users) setUsers(data.users); else setError('ไม่สามารถดึงข้อมูลผู้ใช้ได้'); setLoading(false); })
      .catch(() => { setError('เกิดข้อผิดพลาด'); setLoading(false); });
  };

  const showOk = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  /* handlers */
  const openEdit = (user) => { setSelectedUser(user); setEditData({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone }); setShowEditModal(true); };
  const openPoints = (user) => { setSelectedUser(user); setPointsData({ points: user.current_points || 0, reason: '' }); setShowPointsModal(true); };
  const openActivity = (user) => { setSelectedUser(user); setShowActivityModal(true); };

  const handleSave = () => {
    setSaving(true);
    secureLocalFetch(`${API_URL}/admin/users/${selectedUser.user_id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
      .then(r => r.json()).then(d => { if (d.success) { showOk('บันทึกข้อมูลเรียบร้อย'); setShowEditModal(false); fetchUsers(); } else setError(d.error || 'เกิดข้อผิดพลาด'); })
      .catch(() => setError('เกิดข้อผิดพลาด')).finally(() => setSaving(false));
  };

  const handleSavePoints = () => {
    setSaving(true);
    secureLocalFetch(`${API_URL}/admin/users/${selectedUser.user_id}/points`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(pointsData) })
      .then(r => r.json()).then(d => { if (d.success) { showOk(`บันทึกแต้มเรียบร้อย (${d.old_points} → ${d.new_points})`); setShowPointsModal(false); fetchUsers(); } else setError(d.error || 'เกิดข้อผิดพลาด'); })
      .catch(() => setError('เกิดข้อผิดพลาด')).finally(() => setSaving(false));
  };

  const changeRole = (userId, role) => {
    if (!window.confirm(`เปลี่ยนบทบาทเป็น ${role} ใช่หรือไม่?`)) return;
    secureLocalFetch(`${API_URL}/admin/users/${userId}/role`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
      .then(r => r.json()).then(d => { if (d.success) { showOk('บทบาทเปลี่ยนเรียบร้อย'); fetchUsers(); } else setError(d.error || 'เกิดข้อผิดพลาด'); })
      .catch(() => setError('เกิดข้อผิดพลาด'));
  };

  const banUser = (userId) => {
    if (!window.confirm('แบนผู้ใช้นี้ใช่หรือไม่?')) return;
    secureLocalFetch(`${API_URL}/admin/users/${userId}/ban`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'แบนโดยแอดมิน' }) })
      .then(r => r.json()).then(d => { if (d.success) { showOk('แบนผู้ใช้เรียบร้อย'); fetchUsers(); } else setError(d.error || 'เกิดข้อผิดพลาด'); })
      .catch(() => setError('เกิดข้อผิดพลาด'));
  };

  const unbanUser = (userId) => {
    if (!window.confirm('ยกเลิกการแบนผู้ใช้นี้ใช่หรือไม่?')) return;
    secureLocalFetch(`${API_URL}/admin/users/${userId}/unban`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'ยกเลิกการแบนโดยแอดมิน' }) })
      .then(r => r.json()).then(d => { if (d.success) { showOk('ยกเลิกการแบนเรียบร้อย'); fetchUsers(); } else setError(d.error || 'เกิดข้อผิดพลาด'); })
      .catch(() => setError('เกิดข้อผิดพลาด'));
  };

  const [expandId, setExpandId] = useState(null);

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading && users.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: 56, borderRadius: 10, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />)}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", margin: "0 0 2px" }}>👥 จัดการผู้ใช้</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{users.length} รายการ</p>
        </div>
      </div>

      {/* Alerts */}
      {error   && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fff0e8", border: "1px solid #ffe8d4", color: "#4a2008", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
      {success && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#edf3ff", border: "1px solid #b8d4fb", color: "#1a3a6e", fontSize: 13, marginBottom: 12 }}>{success}</div>}

      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input type="text" placeholder="ค้นหาชื่อ อีเมล..." value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchUsers()}
          style={{ flex: "1 1 180px", padding: "8px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#4b8ff4"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none", cursor: "pointer", background: "#fff", color: "#475569" }}>
          <option value="">ทุกบทบาท</option>
          <option value="Admin">Admin</option>
          <option value="Entrepreneur">Entrepreneur</option>
          <option value="Tourist">Tourist</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none", cursor: "pointer", background: "#fff", color: "#475569" }}>
          <option value="">ทุกสถานะ</option>
          <option value="true">ทำงานอยู่</option>
          <option value="false">ถูกแบน</option>
        </select>
        <button onClick={fetchUsers}
          style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          🔍 ค้นหา
        </button>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>👥</p>
          <p style={{ fontWeight: 600, fontSize: 14 }}>ไม่พบผู้ใช้</p>
        </div>
      ) : (
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" }}>

          {/* Column headers — 4 columns only */}
          <div className="admin-user-table-head" style={{ display: "grid", gridTemplateColumns: "1fr 110px 70px 140px", gap: 0, background: "#f8fafc", padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>
            {["ผู้ใช้", "สถานะ / บทบาท", "แต้ม", "การดำเนินการ"].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
            ))}
          </div>

          {users.map((user, idx) => {
            const even     = idx % 2 === 0;
            const banned   = !user.is_active;
            const open     = expandId === user.user_id;
            const baseBg   = banned ? "#fff0e8" : even ? "#fff" : "#fafafa";

            return (
              <div key={user.user_id} style={{ borderBottom: idx < users.length - 1 ? "1px solid #f1f5f9" : "none" }}>

                {/* ── Main row (4 compact columns) ──────────────── */}
                <div
                  className="admin-user-row"
                  style={{ display: "grid", gridTemplateColumns: "1fr 110px 70px 140px", gap: 0, padding: "11px 16px", alignItems: "center", background: open ? "#edf3ff" : baseBg, cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!open) e.currentTarget.style.background = banned ? "#fff0e8" : "#f0f4ff"; }}
                  onMouseLeave={e => e.currentTarget.style.background = open ? "#edf3ff" : baseBg}
                  onClick={() => setExpandId(open ? null : user.user_id)}
                >
                  {/* Col 1: name + email + role badge */}
                  <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: banned ? "#ffe8d4" : "linear-gradient(135deg,#4b8ff4,#4b8ff4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      {((user.first_name || user.email || "?")[0]).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.first_name} {user.last_name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
                    </div>
                  </div>

                  {/* Col 2: status + role stacked */}
                  <div className="admin-user-col-badges">
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, width: "fit-content", background: user.is_active ? "#edf3ff" : "#fff0e8", color: user.is_active ? "#1a3a6e" : "#4a2008", border: `1px solid ${user.is_active ? "#85b3f7" : "#e8b895"}`, whiteSpace: "nowrap" }}>
                      {user.is_active ? "✓ ปกติ" : "✕ แบน"}
                    </span>
                    <RoleBadge role={user.role} />
                  </div>

                  {/* Col 3: points */}
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#8d4d11", whiteSpace: "nowrap" }}>⭐ {user.current_points || 0}</span>

                  {/* Col 4: action buttons (stop propagation so they don't toggle expand) */}
                  <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                    <ActionBtn title="แก้ไข"     color="#4b8ff4" onClick={() => openEdit(user)}>✏️</ActionBtn>
                    <ActionBtn title="แก้ไขแต้ม" color="#8d4d11" onClick={() => openPoints(user)}>⭐</ActionBtn>
                    <ActionBtn title="ประวัติ"   color="#4b8ff4" onClick={() => openActivity(user)}>📋</ActionBtn>
                    {user.is_active
                      ? <ActionBtn title="แบน"     color="#8d4d11" onClick={() => banUser(user.user_id)}>🚫</ActionBtn>
                      : <ActionBtn title="ปลดแบน" color="#4b8ff4" onClick={() => unbanUser(user.user_id)}>✓</ActionBtn>
                    }
                  </div>
                </div>

                {/* ── Expanded: role change ──────────────────────── */}
                {open && (
                  <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "12px 18px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>เปลี่ยนบทบาท:</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { key: "Tourist",      label: "🧳 Tourist",      col: "#4b8ff4", bg: "#edf3ff" },
                        { key: "Entrepreneur", label: "🏪 ผู้ประกอบการ", col: "#8d4d11", bg: "#fff8f0" },
                        { key: "Admin",        label: "🛡️ Admin",         col: "#8d4d11", bg: "#fff0e8" },
                      ].map(r => {
                        const active = user.role === r.key;
                        return (
                          <button key={r.key} onClick={() => changeRole(user.user_id, r.key)}
                            style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${active ? r.col : "#e2e8f0"}`, background: active ? r.bg : "#fff", color: active ? r.col : "#94a3b8", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>ID: {user.user_id} · 📞 {user.phone || "—"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit user modal ──────────────────────────────────── */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ แก้ไขข้อมูลผู้ใช้"
        footer={<>
          <button onClick={() => setShowEditModal(false)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
        </>}
      >
        <Field label="User ID"><input value={selectedUser?.user_id || ""} disabled style={{ ...inputStyle, background: "#f8fafc", color: "#94a3b8" }} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="ชื่อจริง"><input value={editData.first_name || ""} onChange={e => setEditData(d => ({ ...d, first_name: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor="#4b8ff4"} onBlur={e => e.target.style.borderColor="#e2e8f0"} /></Field>
          <Field label="นามสกุล"><input value={editData.last_name || ""} onChange={e => setEditData(d => ({ ...d, last_name: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor="#4b8ff4"} onBlur={e => e.target.style.borderColor="#e2e8f0"} /></Field>
        </div>
        <Field label="อีเมล"><input type="email" value={editData.email || ""} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor="#4b8ff4"} onBlur={e => e.target.style.borderColor="#e2e8f0"} /></Field>
        <Field label="เบอร์โทร"><input value={editData.phone || ""} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor="#4b8ff4"} onBlur={e => e.target.style.borderColor="#e2e8f0"} /></Field>
      </Modal>

      {/* ── Edit points modal ────────────────────────────────── */}
      <Modal show={showPointsModal} onClose={() => setShowPointsModal(false)} title="⭐ แก้ไขแต้มสะสม"
        footer={<>
          <button onClick={() => setShowPointsModal(false)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={handleSavePoints} disabled={saving} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
        </>}
      >
        <Field label="ผู้ใช้"><input value={`${selectedUser?.first_name || ""} ${selectedUser?.last_name || ""}`.trim()} disabled style={{ ...inputStyle, background: "#f8fafc", color: "#94a3b8" }} /></Field>
        <Field label="แต้มปัจจุบัน"><input value={selectedUser?.current_points || 0} disabled style={{ ...inputStyle, background: "#fff8f0", color: "#8d4d11", fontWeight: 800 }} /></Field>
        <Field label="แต้มใหม่">
          <input type="number" value={pointsData.points} min="0" onChange={e => setPointsData(d => ({ ...d, points: parseInt(e.target.value) || 0 }))} style={inputStyle} onFocus={e => e.target.style.borderColor="#8d4d11"} onBlur={e => e.target.style.borderColor="#e2e8f0"} />
        </Field>
        <Field label="เหตุผล">
          <textarea value={pointsData.reason} onChange={e => setPointsData(d => ({ ...d, reason: e.target.value }))} placeholder="เหตุผลในการเปลี่ยนแปลง..." rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor="#8d4d11"} onBlur={e => e.target.style.borderColor="#e2e8f0"} />
        </Field>
      </Modal>

      {/* ── Activity History (keeps react-bootstrap modal) ─── */}
      <ActivityHistory token={token} userId={selectedUser?.user_id} show={showActivityModal} onHide={() => setShowActivityModal(false)} />
    </div>
  );
}

/* ─── Small action button ────────────────────────────────────────── */
function ActionBtn({ children, onClick, title, color }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${hov ? color : "#e2e8f0"}`, background: hov ? `${color}15` : "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
      {children}
    </button>
  );
}

export default UserManagement;
