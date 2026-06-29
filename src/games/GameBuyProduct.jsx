// ============================================================
// games/GameBuyProduct.jsx — เกมซื้อสินค้าสะสมภารกิจ
//
// หน้าที่: แสดงภารกิจการซื้อ (Quests) และติดตามความคืบหน้า
//
// รูปแบบภารกิจ:
//   - buy_count     → สั่งซื้อสินค้า X ครั้ง
//   - buy_amount    → ใช้จ่ายรวม X บาท
//   - visit_shops   → เยี่ยมชม X ร้านค้า
//   - buy_in_market → ซื้อจากตลาดนั้น X ครั้ง
//   - visit_markets → เยี่ยมชม X ตลาด
//
// เมื่อทำภารกิจสำเร็จ: POST /quests/:id/claim → รับคะแนน
// API: GET /quests, POST /quests/:id/claim
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBullseye, FaTrophy, FaStore, FaCircleCheck, FaStar, FaGift, FaCircleXmark, FaRotateRight, FaTriangleExclamation, FaSpinner, FaLock, FaLightbulb } from 'react-icons/fa6';
import API_URL, { secureLocalFetch } from '../config';

const token = () => localStorage.getItem('token') || '';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const TYPE_LABEL = {
  buy_count:     'คำสั่งซื้อ',
  buy_amount:    'บาท',
  visit_shops:   'ร้านค้า',
  buy_in_market: 'ครั้ง',
  visit_markets: 'ตลาดน้ำ',
  buy_from_shop: 'ครั้ง',
};

const TIER_COLOR = (pct) => {
  if (pct >= 1)   return { bar: '#22c55e', bg: '#f0fdf4', border: '#86efac', text: '#166534' };
  if (pct >= 0.5) return { bar: '#8d4d11', bg: '#fff8f0', border: 'rgba(141,77,17,0.3)', text: '#5c2c08' };
  return              { bar: '#c0a882', bg: '#f4f2ef',  border: '#ede9e3',               text: '#7a5c40' };
};

/* ── Progress Bar ───────────────────────────────────────────── */
function ProgressBar({ current, target, type }) {
  const pct  = Math.min(current / target, 1);
  const c    = TIER_COLOR(pct);
  const unit = TYPE_LABEL[type] || '';
  const display = type === 'buy_amount'
    ? `฿${Number(current).toLocaleString()} / ฿${Number(target).toLocaleString()}`
    : `${current} / ${target} ${unit}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#7a5c40', marginBottom: 5 }}>
        <span>ความคืบหน้า</span>
        <span style={{ color: c.text }}>{display}</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: '#ede9e3', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct * 100}%`, background: c.bar, transition: 'width 0.6s ease' }} />
      </div>
      {pct >= 1 && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaBullseye /> ถึงเป้าหมายแล้ว!</div>
      )}
    </div>
  );
}

/* ── Quest Card ──────────────────────────────────────────────── */
function QuestCard({ quest, onClaim, claiming }) {
  const pct      = quest.target_value > 0 ? quest.current_value / quest.target_value : 0;
  const c        = TIER_COLOR(pct);
  const navigate = useNavigate();
  const achieved = pct >= 1;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: `1.5px solid ${
        quest.reward_claimed ? '#ede9e3'
        : quest.can_claim    ? '#86efac'
        : c.border
      }`,
      padding: '20px 22px',
      boxShadow: quest.can_claim && !quest.reward_claimed
        ? '0 4px 20px rgba(34,197,94,0.18)'
        : '0 2px 8px rgba(0,0,0,0.05)',
      opacity: quest.reward_claimed ? 0.6 : 1,
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Goal-reached banner */}
      {achieved && !quest.reward_claimed && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg,#22c55e,#16a34a)',
          color: '#fff', fontSize: 11, fontWeight: 800,
          textAlign: 'center', padding: '5px 0', letterSpacing: '0.06em',
        }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><FaTrophy /> บรรลุเป้าหมายแล้ว!</span></div>
      )}

      {/* Claimed ribbon */}
      {quest.reward_claimed && (
        <div style={{
          position: 'absolute', top: 12, right: -22, background: '#b89a7a',
          color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 32px',
          transform: 'rotate(45deg)', letterSpacing: '0.05em',
        }}>รับแล้ว</div>
      )}

      {/* Header — push down if achieved banner showing */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, marginTop: achieved && !quest.reward_claimed ? 18 : 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: quest.reward_claimed ? '#f4f2ef' : c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{quest.icon || <FaBullseye />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#3d1a05', marginBottom: 3 }}>{quest.name}</div>
          <div style={{ fontSize: 12, color: '#7a5c40', lineHeight: 1.5 }}>{quest.description}</div>
          {quest.quest_type === 'buy_from_shop' && quest.shop_name && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:5, padding:'2px 10px', borderRadius:99, background:'#f0fdf4', border:'1px solid #86efac', fontSize:11, fontWeight:700, color:'#15803d' }}>
              <FaStore /> {quest.shop_name}
            </div>
          )}
        </div>
        <div style={{
          flexShrink: 0, padding: '4px 12px', borderRadius: 99,
          background: quest.reward_claimed ? '#f4f2ef' : c.bg,
          border: `1px solid ${quest.reward_claimed ? '#ede9e3' : c.border}`,
          fontSize: 12, fontWeight: 800,
          color: quest.reward_claimed ? '#b89a7a' : c.text,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <FaStar /> {quest.points_reward}
        </div>
      </div>

      {/* Progress */}
      <ProgressBar current={quest.current_value} target={quest.target_value} type={quest.quest_type} />

      {/* Action */}
      {quest.reward_claimed ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#b89a7a', fontWeight: 600, padding: '6px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
          <FaCircleCheck /> รับรางวัลแล้ว
        </div>
      ) : quest.can_claim ? (
        <button
          onClick={() => onClaim(quest.quest_id)}
          disabled={claiming === quest.quest_id}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: claiming === quest.quest_id
              ? '#b89a7a'
              : 'linear-gradient(135deg,#16a34a,#15803d)',
            color: '#fff', fontWeight: 800, fontSize: 14,
            cursor: claiming === quest.quest_id ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(22,163,74,0.35)', transition: 'all 0.2s',
            letterSpacing: '0.01em',
          }}
        >
          {claiming === quest.quest_id ? 'กำลังรับรางวัล...' : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaGift /> รับ {quest.points_reward} แต้ม!</span>}
        </button>
      ) : (
        <button
          onClick={() => {
            if (quest.quest_type === 'buy_from_shop' && quest.shop_id) {
              navigate(`/shop-product/${quest.shop_id}`);
            } else {
              navigate('/market');
            }
          }}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 12,
            border: `1.5px solid ${c.border}`, background: c.bg,
            color: c.text, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {quest.quest_type === 'buy_from_shop' && quest.shop_name
            ? `🏪 ไปที่ ${quest.shop_name}`
            : '🛒 ไปซื้อสินค้าเลย!'}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function GameBuyProduct({ onPointsChanged }) {
  const [quests,   setQuests]   = useState([]);
  const [points,   setPoints]   = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [error,    setError]    = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`${API_URL}/quests`, { headers: authH() }),
        secureLocalFetch(`${API_URL}/user/points`, { headers: authH() }),
      ]);
      const qData = await qRes.json();
      const pData = await pRes.json();
      if (Array.isArray(qData)) setQuests(qData);
      else setError('โหลดเควสไม่สำเร็จ');
      if (pData.success) setPoints(pData.points || 0);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleClaim = async (quest_id) => {
    setClaiming(quest_id);
    try {
      const res  = await fetch(`${API_URL}/quests/${quest_id}/claim`, {
        method: 'POST', headers: authH(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(<span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><FaGift /> {data.message} · แต้มรวม {data.total_points?.toLocaleString()}</span>);
        setPoints(data.total_points ?? points);
        onPointsChanged?.(data.total_points);
        await fetchAll();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', false);
      }
    } catch {
      showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', false);
    } finally {
      setClaiming(null);
    }
  };

  /* ── derived ─────────────────────────────────────────────── */
  const completed  = quests.filter(q => q.reward_claimed).length;
  const available  = quests.filter(q => q.can_claim).length;
  const inProgress = quests.filter(q => !q.reward_claimed && !q.can_claim).length;

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div style={{ padding: '0 4px', fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 24px', borderRadius: 12,
          background: toast.ok ? '#f0fdf4' : '#fff0e8',
          border: `1.5px solid ${toast.ok ? '#86efac' : '#e8b895'}`,
          color: toast.ok ? '#166534' : '#4a2008',
          fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#3d1a05', display:'flex', alignItems:'center', gap:8 }}><FaStore /> เควสซื้อของ</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7a5c40' }}>ซื้อสินค้าจริงเพื่อรับแต้ม — ติดตามความคืบหน้าได้ที่นี่</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', fontWeight: 800, fontSize: 15, color: '#fff', boxShadow: '0 4px 12px rgba(141,77,17,0.3)' }}>
            ⭐ {points.toLocaleString()} แต้ม
          </div>
          <button onClick={fetchAll} disabled={loading}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #ede9e3', background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, color: '#6b3a0d' }}>
            {loading ? <FaSpinner /> : <FaRotateRight />} รีเฟรช
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'รับรางวัลได้',   value: available,  bg: '#f0fdf4', color: '#166534', border: '#86efac' },
          { label: 'กำลังทำ',        value: inProgress, bg: '#fff8f0', color: '#5c2c08', border: 'rgba(141,77,17,0.25)' },
          { label: 'เสร็จแล้ว',      value: completed,  bg: '#f4f2ef', color: '#7a5c40', border: '#ede9e3' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700,
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
          }}>
            {s.value} {s.label}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fff0e8', border: '1px solid #e8b895', color: '#4a2008', fontSize: 13, marginBottom: 16 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><FaTriangleExclamation /> {error}</span>
        </div>
      )}

      {/* Quest grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 200, borderRadius: 18, background: 'linear-gradient(90deg,#f4f2ef 25%,#ede9e3 50%,#f4f2ef 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      ) : quests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#b89a7a' }}>
          <p style={{ fontSize: 40, margin: '0 0 10px' }}><FaBullseye /></p>
          <p style={{ fontWeight: 600 }}>ยังไม่มีเควสในระบบ</p>
        </div>
      ) : (
        <>
          {/* Claimable first */}
          {available > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaGift /> รับรางวัลได้เลย!</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {quests.filter(q => q.can_claim).map(q => (
                  <QuestCard key={q.quest_id} quest={q} onClaim={handleClaim} claiming={claiming} />
                ))}
              </div>
            </div>
          )}

          {/* In progress */}
          {inProgress > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#8d4d11', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🔥 กำลังดำเนินการ
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {quests.filter(q => !q.reward_claimed && !q.can_claim).map(q => (
                  <QuestCard key={q.quest_id} quest={q} onClaim={handleClaim} claiming={claiming} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed > 0 && (
            <div>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#b89a7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaCircleCheck /> รับรางวัลแล้ว</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {quests.filter(q => q.reward_claimed).map(q => (
                  <QuestCard key={q.quest_id} quest={q} onClaim={handleClaim} claiming={claiming} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Hint */}
      <div style={{ marginTop: 28, padding: '14px 18px', borderRadius: 14, background: '#fff8f0', border: '1px solid #ede9e3', fontSize: 13, color: '#7a5c40', lineHeight: 1.7 }}>
        <strong style={{ color: '#3d1a05', display:'inline-flex', alignItems:'center', gap:6 }}><FaLightbulb /> วิธีทำเควส</strong><br />
        ไปที่ <strong>ตลาดน้ำ → ร้านค้า → สั่งซื้อสินค้า</strong> แล้วชำระเงิน เมื่อออเดอร์เสร็จสิ้น ความคืบหน้าจะอัปเดตอัตโนมัติ<br />
        กด <strong><FaRotateRight /> รีเฟรช</strong> เพื่อดูความคืบหน้าล่าสุด
      </div>
    </div>
  );
}
