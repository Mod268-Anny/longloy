// ============================================================
// AdminPanel/EntrepreneurApprovals.jsx — อนุมัติผู้ประกอบการ
//
// หน้าที่: แสดงรายการคำขอเป็นผู้ประกอบการที่รอการอนุมัติ
//
// ฟีเจอร์:
//   - ดูข้อมูลร้านค้าที่ขอสมัคร
//   - อนุมัติ (PUT /entrepreneur/approve/:id) หรือ ปฏิเสธ (PUT /entrepreneur/reject/:id)
//   - แสดงผู้ประกอบการทั้งหมดที่ผ่านการอนุมัติแล้ว
//
// ใช้ใน: AdminDashboard.jsx tab "entrepreneurs"
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import API_URL, { secureLocalFetch } from '../config';

/* ── tiny helpers ─────────────────────────────────────────────────── */
const Chip = ({ label, color, bg, border }) => (
  <span style={{
    display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px",
    borderRadius: 20, background: bg, color, border: `1px solid ${border}`,
    whiteSpace: "nowrap",
  }}>{label}</span>
);

const Meta = ({ icon, text }) => text ? (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
    <span style={{ opacity: 0.7 }}>{icon}</span> {text}
  </span>
) : null;

/* ═══════════════════════════════════════════════════════════════════ */
export default function EntrepreneurApprovals({ token, view = 'pending' }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [ok,      setOk]      = useState('');
  const [openId,  setOpenId]  = useState(null);
  const lastViewRef = useRef(null);

  useEffect(() => {
    if (lastViewRef.current !== view) { lastViewRef.current = view; load(); }
  }, [view]);

  const load = () => {
    if (!list.length) setLoading(true);
    setErr('');
    const ep = view === 'pending' ? '/admin/pending-entrepreneurs' : '/admin/entrepreneurs';
    secureLocalFetch(`${API_URL}${ep}`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(d => { setList(d.entrepreneurs || []); setLoading(false); })
      .catch(() => { setErr('โหลดข้อมูลไม่ได้'); setLoading(false); });
  };

  const doAction = (id, action) => {
    const lbl = action === 'verify' ? 'อนุมัติ' : 'ปฏิเสธ';
    if (!window.confirm(`${lbl}ผู้ประกอบการนี้ใช่หรือไม่?`)) return;
    secureLocalFetch(`${API_URL}/admin/entrepreneurs/${id}/${action}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setOk(`${lbl}แล้ว ✓`); load(); setTimeout(() => setOk(''), 3000); }
        else setErr(d.error || 'เกิดข้อผิดพลาด');
      })
      .catch(() => setErr('เกิดข้อผิดพลาด'));
  };

  /* ── Skeleton ─────────────────────────────────────────────────── */
  if (loading && !list.length) return (
    <div>
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: 96, borderRadius: 14, marginBottom: 12, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sk 1.4s infinite" }} />
      ))}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 17, color: "#0f172a" }}>
            {view === 'pending' ? '⏳ คำขออนุมัติ' : '🏪 ผู้ประกอบการทั้งหมด'}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{list.length} รายการ</p>
        </div>
        <button onClick={load}
          style={{ padding: "7px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" }}>
          ↺ รีเฟรช
        </button>
      </div>

      {/* Alerts */}
      {err && <div style={{ padding: "11px 16px", borderRadius: 10, background: "#fff0e8", border: "1px solid #ffe8d4", color: "#4a2008", fontSize: 13, marginBottom: 14 }}>⚠️ {err}</div>}
      {ok  && <div style={{ padding: "11px 16px", borderRadius: 10, background: "#edf3ff", border: "1px solid #b8d4fb", color: "#1a3a6e", fontSize: 13, marginBottom: 14 }}>{ok}</div>}

      {/* Empty */}
      {!list.length ? (
        <div style={{ textAlign: "center", padding: "56px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
          <p style={{ fontWeight: 600, margin: 0 }}>{view === 'pending' ? 'ไม่มีคำขอที่รอการอนุมัติ' : 'ยังไม่มีผู้ประกอบการ'}</p>
        </div>
      ) : (
        /* ── Cards ──────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map(e => {
            const verified = !!e.is_verified;
            const isOpen   = openId === e.entrepreneurs_id;

            /* left accent color */
            const accent = verified ? "#4b8ff4" : "#8d4d11";

            return (
              <div key={e.entrepreneurs_id} style={{
                borderRadius: 14,
                borderTop:    `1px solid ${isOpen ? (verified ? "#85b3f7" : "#e8b895") : "#e2e8f0"}`,
                borderRight:  `1px solid ${isOpen ? (verified ? "#85b3f7" : "#e8b895") : "#e2e8f0"}`,
                borderBottom: `1px solid ${isOpen ? (verified ? "#85b3f7" : "#e8b895") : "#e2e8f0"}`,
                borderLeft:   `4px solid ${accent}`,
                background: "#fff",
                boxShadow: isOpen ? `0 4px 20px rgba(0,0,0,0.08)` : "0 1px 4px rgba(0,0,0,0.05)",
                overflow: "hidden",
                transition: "box-shadow 0.2s, border-color 0.2s",
              }}>

                {/* ── Summary (click to expand) ─────────────────── */}
                <div
                  onClick={() => setOpenId(isOpen ? null : e.entrepreneurs_id)}
                  style={{ padding: "16px 20px", cursor: "pointer", userSelect: "none" }}
                >
                  {/* Top: name + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🏪 {e.shop_name || "ไม่ระบุชื่อร้าน"}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        👤 {e.first_name && e.last_name ? `${e.first_name} ${e.last_name}` : `ผู้ใช้ ID: ${e.user_id}`}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Chip
                        label={verified ? "✓ อนุมัติแล้ว" : "⏳ รอการอนุมัติ"}
                        color={verified ? "#1a3a6e" : "#5c2c08"}
                        bg={verified ? "#edf3ff" : "#fff8f0"}
                        border={verified ? "#85b3f7" : "#d4880a"}
                      />
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Bottom: meta pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <Meta icon="🏷️" text={e.category} />
                    <Meta icon="📞" text={e.phone_number} />
                    <Meta icon="🕐" text={e.open_time && e.close_time ? `${e.open_time} – ${e.close_time}` : null} />
                    <Meta icon="📍" text={e.location} />
                  </div>
                </div>

                {/* ── Expanded detail ───────────────────────────── */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa", padding: "18px 20px" }}>

                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "12px 24px", marginBottom: 16 }}>
                      {[
                        ["อีเมล",             e.email],
                        ["เบอร์เพิ่มเติม",    e.phone_number2],
                        ["เบอร์ร้านค้า",      e.shop_number],
                        ["เลขบัตรประชาชน",   e.id_card_number],
                        ["ธนาคาร",           e.bank_name ? `${e.bank_name} · ${e.bank_account_no}` : null],
                        ["เวลาเปิด-ปิด",     e.open_time && e.close_time ? `${e.open_time} – ${e.close_time}` : null],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label}>
                          <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 13, color: "#334155", fontWeight: 500 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {e.description && (
                      <div style={{ padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9", marginBottom: 14 }}>
                        <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>รายละเอียด</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{e.description}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {!verified && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={ev => { ev.stopPropagation(); doAction(e.entrepreneurs_id, 'verify'); }}
                          style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4b8ff4,#2d6fd4)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(75,143,244,0.25)" }}>
                          ✓ อนุมัติ
                        </button>
                        <button
                          onClick={ev => { ev.stopPropagation(); doAction(e.entrepreneurs_id, 'reject'); }}
                          style={{ padding: "9px 22px", borderRadius: 10, border: "1.5px solid #e8b895", background: "#fff0e8", color: "#6b3a0d", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                          ✕ ปฏิเสธ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
