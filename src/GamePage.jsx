// ============================================================
// GamePage.jsx — หน้ารวมเกมและภารกิจ
//
// หน้าที่: แสดงเกม 3 ประเภทที่เลือกได้ผ่าน query ?game=
//
// เกมที่มี (โหลดเป็น component แยก):
//   - GameStepCounter  (?game=stepCounter) — เดินสะสมก้าว → แลกคะแนน
//   - GameBuyProduct   (?game=buyProduct)  — ซื้อสินค้าร้านใหม่ → รับคะแนน
//   - GameQuiz         (?game=quiz)        — ตอบคำถามรายวัน → รับคะแนน
//
// หน้าหลักแสดงการ์ดเกมทั้ง 3 ให้เลือก เมื่อกดจะสลับแสดง component
// ============================================================
import React, { useState } from 'react';
import API_URL, { secureLocalFetch } from './config';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdHome, MdHelpOutline, MdOutlineSportsEsports, MdStorefront } from 'react-icons/md';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import GameBuyProduct from './games/GameBuyProduct';
import GameStepCounter from './games/GameStepCounter';
import GameQuiz from './games/GameQuiz';
import useCartCount from './useCartCount';

/* ─── shared nav config (ตรงกับ Homepage) ──────────────────────── */
const NAV = [
  { label: "หน้าแรก",  icon: <MdHome size={18} />,                 path: "/homepage" },
  { label: "ตลาดน้ำ",  icon: <MdStorefront size={18} />,            path: "/market"   },
  { label: "เกม",      icon: <MdOutlineSportsEsports size={18} />,  path: "/game"     },
  { label: "ช่วยเหลือ",icon: <MdHelpOutline size={18} />,           path: "/help"     },
];

const GAME_CARDS = [
  { key: "buy",  emoji: "🛍️", label: "เกมซื้อของ",  sub: "ซื้อสินค้าเพื่อรับแต้มพิเศษ",   col: "#8d4d11", dark: "#6b3a0d" },
  { key: "step", emoji: "🏃",  label: "เกมเก็บก้าว", sub: "เดินและออกกำลังกายเก็บคะแนน",   col: "#8d4d11", dark: "#6b3a0d" },
  { key: "quiz", emoji: "🧠", label: "เกมตอบคำถาม", sub: "ตอบคำถามรับแต้มโบนัส",           col: "#8d4d11", dark: "#6b3a0d" },
];

const REWARD_ICONS = ["🎟️", "🎫", "🏆", "🎀", "💎", "🌟"];

/* ═══════════════════════════════════════════════════════════════ */
export default function GamePage() {
  const cartCount = useCartCount();
  const [selectedGame, setSelectedGame] = useState(null);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [pointsExpiryDate, setPointsExpiryDate] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [rewards,      setRewards]      = useState([]);
  const [history,      setHistory]      = useState([]);
  const [redeemingId,  setRedeemingId]  = useState(null);
  const [redeemMsg,    setRedeemMsg]    = useState(null);
  const [redeemErr,    setRedeemErr]    = useState(null);
  const [myCoupons,    setMyCoupons]    = useState([]);
  const [historyPage,  setHistoryPage]  = useState(1);
  const HISTORY_PER_PAGE = 10;
  const [couponPage,   setCouponPage]   = useState(1);
  const COUPON_PER_PAGE = 10;

  const navigate = useNavigate();
  const location = useLocation();

  /* ── URL param → auto-select game ──────────────────────────── */
  React.useEffect(() => {
    const p = new URLSearchParams(location.search);
    const g = p.get('game');
    if      (g === 'stepCounter') setSelectedGame('step');
    else if (g === 'buyProduct')  setSelectedGame('buy');
    else if (g === 'quiz')        setSelectedGame('quiz');
  }, [location.search]);

  /* ── fetch points ───────────────────────────────────────────── */
  React.useEffect(() => {
    const go = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res  = await secureLocalFetch(`${API_URL}/user/points`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setTotalPoints(data.points || 0);
          setPointsExpiryDate(data.expiry_date || data.points_expiry_date);
        }
      } catch (e) {
        console.error('❌ Error fetching points:', e);
      }
      finally { setLoading(false); }
    };
    go();
  }, [selectedGame]);

  /* ── fetch rewards ──────────────────────────────────────────── */
  React.useEffect(() => {
    secureLocalFetch(`${API_URL}/rewards`)
      .then(r => r.json())
      .then(d => setRewards(Array.isArray(d) ? d : []))
      .catch(() => setRewards([]));
  }, []);

  /* ── fetch history ──────────────────────────────────────────── */
  React.useEffect(() => {
    const go = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res  = await secureLocalFetch(`${API_URL}/user/redemption-history`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch {}
    };
    go();
  }, []);

  /* ── fetch my coupons ───────────────────────────────────────── */
  const loadMyCoupons = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res  = await secureLocalFetch(`${API_URL}/user/my-coupons`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMyCoupons(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  React.useEffect(() => { loadMyCoupons(); }, [loadMyCoupons]);

  /* ── redeem ─────────────────────────────────────────────────── */
  const handleRedeem = async (reward) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showErr('ต้องล็อกอินก่อน'); return; }
      setRedeemingId(reward.reward_id);
      const res  = await secureLocalFetch(`${API_URL}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reward_id: reward.reward_id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemMsg(`🎉 ${data.message}\n🎟️ คูปอง: ${data.coupon_code}\n⭐ ใช้แต้มไป: ${data.points_spent}`);
        setTotalPoints(data.remaining_points);
        const hist = await secureLocalFetch(`${API_URL}/user/redemption-history`, { headers: { Authorization: `Bearer ${token}` } });
        const hd = await hist.json();
        setHistory(Array.isArray(hd) ? hd : []);
        loadMyCoupons();
        setTimeout(() => setRedeemMsg(null), 4500);
      } else {
        showErr(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) { showErr(e.message); }
    finally { setRedeemingId(null); }
  };

  const showErr = (msg) => { setRedeemErr(msg); setTimeout(() => setRedeemErr(null), 2500); };

  /* ════════════════════════════════ RENDER ══════════════════════ */
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f4f2ef", minHeight: "100vh", color: "#1a0f08" }}>
      <style>{`
        .gp-h1  { color: #1a0f08 !important; }
        .gp-h2  { color: #1a0f08 !important; }
        .gp-btn { color: #ffffff !important; }
        .gp-redeem-canafford { color: #ffffff !important; }
        @keyframes gp-float    { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-8px)} }
        @keyframes gp-pulse-glow { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
        @keyframes gp-slide-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gp-shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes gp-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .gp-card-enter { animation: gp-slide-in 0.4s ease forwards; }
        .gp-floating   { animation: gp-float 3.5s ease-in-out infinite; }
        .gp-nav-btn:hover { background: #fff8f0 !important; color: #8d4d11 !important; }
        .gp-game-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 640px) { .gp-game-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ══════════════ NAVBAR (identical to Homepage) ══════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Logo */}
          <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
          </button>

          {/* Nav */}
          <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  background: active ? "#edf3ff" : "transparent",
                  color: active ? "#4b8ff4" : "#475569",
                  transition: "all 0.15s",
                }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => navigate("/cart")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
            <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ HERO SECTION ════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg,#8d4d11 0%,#6b3a0d 55%,#4a2a0a 100%)", position: "relative", overflow: "hidden" }}>
        {/* Ambient blobs */}
        <div style={{ position:"absolute", top:-100, right:-80, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,200,120,0.14) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-80, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"30%", left:"30%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,180,80,0.07) 0%,transparent 70%)", pointerEvents:"none" }} />

        {/* Floating particles */}
        {[{top:"15%",left:"8%",size:6,del:0},{top:"60%",left:"5%",size:4,del:1},{top:"25%",right:"12%",size:8,del:0.5},{top:"75%",right:"8%",size:5,del:1.5},{top:"45%",left:"20%",size:3,del:0.8}].map((p,i) => (
          <div key={i} style={{ position:"absolute", top:p.top, left:p.left, right:p.right, width:p.size, height:p.size, borderRadius:"50%", background:"rgba(255,220,150,0.18)", pointerEvents:"none", animation:`gp-float ${3+i*0.4}s ease-in-out ${p.del}s infinite` }} />
        ))}

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 0", position: "relative", zIndex: 1 }}>

          <h1 className="gp-h1" style={{ fontSize:"clamp(2rem,4vw,3.2rem)", fontWeight:900, margin:"0 0 10px", color:"#fff", letterSpacing:"-0.03em", lineHeight:1.1 }}>
            🎮 <span style={{ background:"linear-gradient(90deg,#fff 0%,#f5d0a0 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Game Center</span>
          </h1>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:15, margin:"0 0 40px", lineHeight:1.6 }}>เล่นเกม ทำภารกิจ สะสมแต้ม · แลกรับของรางวัลสุดพิเศษ</p>

          {/* ── Points card inside hero ── */}
          <div style={{
            background:"rgba(0,0,0,0.18)", backdropFilter:"blur(16px)",
            border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:24, padding:"28px 32px", marginBottom:0,
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20,
            boxShadow:"0 8px 40px rgba(0,0,0,0.3)",
          }}>
            <div>
              <p style={{ margin:"0 0 8px", color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>⭐ คะแนนสะสมทั้งหมด</p>
              <div style={{ display:"flex", alignItems:"flex-end", gap:10 }}>
                <span style={{ fontSize:"clamp(2.8rem,5vw,4.2rem)", fontWeight:900, color:"#fff", lineHeight:1, letterSpacing:"-0.02em" }}>
                  {loading ? <span style={{ opacity:0.4 }}>—</span> : totalPoints.toLocaleString()}
                </span>
                <span style={{ fontSize:18, marginBottom:10, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>แต้ม</span>
              </div>
              <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ display:"flex", gap:16 }}>
                  {[{ icon:"🏃", label:"เดิน" },{ icon:"🛍️", label:"ซื้อของ" },{ icon:"🧠", label:"ตอบคำถาม" }].map(s => (
                    <span key={s.label} style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>{s.icon} {s.label}</span>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"5px 12px", border:"1px solid rgba(255,255,255,0.18)", fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:600 }}>
                  ⏰ หมดอายุ: {pointsExpiryDate ? (() => {
                    try {
                      return new Date(pointsExpiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                    } catch {
                      return pointsExpiryDate;
                    }
                  })() : "ไม่มีข้อมูล"}
                </div>
              </div>
            </div>
            <div className="gp-floating" style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))", border:"1.5px solid rgba(255,255,255,0.22)", borderRadius:22, padding:"20px 28px", textAlign:"center", boxShadow:"0 8px 28px rgba(0,0,0,0.25)", flexShrink:0, backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:48 }}>⭐</div>
              <p style={{ margin:"6px 0 0", color:"rgba(255,255,255,0.9)", fontSize:11, fontWeight:800, letterSpacing:"0.1em" }}>POINTS</p>
            </div>
          </div>
        </div>

        <svg viewBox="0 0 1440 50" style={{ display:"block", width:"100%", marginTop:36 }} preserveAspectRatio="none">
          <path d="M0,50 C360,0 1080,0 1440,50 L1440,50 L0,50 Z" fill="#f4f2ef" />
        </svg>
      </section>

      {/* ══════════════ PAGE CONTENT ════════════════════════════════ */}
      <main className="rsp-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* ── Game selection / active game ────────────────────────── */}
        {!selectedGame ? (
          <>
            {/* Section: Choose Game */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:22, borderRadius:2, background:"linear-gradient(to bottom,#8d4d11,#6b3a0d)" }} />
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#8d4d11", letterSpacing:"0.12em", textTransform:"uppercase" }}>เลือกเกมที่ต้องการ</p>
              </div>
              <h2 className="gp-h2" style={{ margin:0, fontSize:"clamp(1.3rem,2.5vw,1.6rem)", fontWeight:800 }}>🕹️ เลือกเกม</h2>
            </div>

            {/* Game Cards */}
            <div className="gp-game-grid" style={{ marginBottom: 56 }}>
              {GAME_CARDS.map((g, i) => (
                <div key={g.key} className="gp-card-enter" style={{ animationDelay: `${i * 0.08}s` }}>
                  <GameSelectCard game={g} onSelect={() => setSelectedGame(g.key)} />
                </div>
              ))}
            </div>

            {/* Notification alerts */}
            {redeemMsg && (
              <Alert type="success" msg={redeemMsg} />
            )}
            {redeemErr && (
              <Alert type="error" msg={redeemErr} />
            )}

            {/* ── Rewards section ─────────────────────────────────── */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <div style={{ width:4, height:22, borderRadius:2, background:"linear-gradient(to bottom,#8d4d11,#6b3a0d)" }} />
                    <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#8d4d11", letterSpacing:"0.12em", textTransform:"uppercase" }}>แลกแต้มเป็นของรางวัล</p>
                  </div>
                  <h2 className="gp-h2" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", fontWeight: 800, margin: 0 }}>🎁 คลังรางวัล</h2>
                </div>
                <div style={{ background:"linear-gradient(135deg,#fff0db,#fff0db)", border:"1px solid #d4880a", borderRadius:14, padding:"10px 18px", fontSize:14, color:"#5c2c08", fontWeight:700, boxShadow:"0 2px 8px rgba(141,77,17,0.2)", display:"flex", alignItems:"center", gap:6 }}>
                  ⭐ <span>{totalPoints.toLocaleString()}</span> <span style={{ fontWeight:400, color:"#5c2c08" }}>แต้มของคุณ</span>
                </div>
              </div>

              {rewards.length === 0 ? (
                <div style={{ textAlign:"center", padding:"56px 24px", color:"#94a3b8", background:"#fff", borderRadius:20, border:"1px solid #ede9e3", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🎁</div>
                  <p style={{ fontWeight:700, fontSize:15, color:"#475569", margin:"0 0 6px" }}>ยังไม่มีรางวัลในขณะนี้</p>
                  <p style={{ fontSize:13, margin:0 }}>ทีมงานจะเพิ่มรางวัลใหม่เร็วๆ นี้</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {rewards.map((r, i) => (
                    <RewardCard
                      key={r.reward_id}
                      reward={r}
                      icon={REWARD_ICONS[i % REWARD_ICONS.length]}
                      canAfford={totalPoints >= r.points_required}
                      redeeming={redeemingId === r.reward_id}
                      onRedeem={() => handleRedeem(r)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── My Coupons ──────────────────────────────────────── */}
            {myCoupons.length > 0 && (() => {
              const couponTotalPages = Math.ceil(myCoupons.length / COUPON_PER_PAGE);
              const couponItems = myCoupons.slice((couponPage - 1) * COUPON_PER_PAGE, couponPage * COUPON_PER_PAGE);
              return (
              <div style={{ marginBottom: 48 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <div style={{ width:4, height:22, borderRadius:2, background:"linear-gradient(to bottom,#8d4d11,#6b3a0d)" }} />
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#8d4d11", letterSpacing:"0.12em", textTransform:"uppercase" }}>วอลเล็ตคูปอง</p>
                    </div>
                    <h2 className="gp-h2" style={{ fontSize:"clamp(1.2rem,2.5vw,1.6rem)", fontWeight:800, margin:0 }}>🎟️ คูปองของฉัน</h2>
                  </div>
                  <span style={{ fontSize:12, color:"#b0a090", fontWeight:500 }}>{myCoupons.length} รายการ</span>
                </div>
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #ede9e3", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ background:"#faf8f5" }}>
                          {["#","ชื่อรางวัล","รหัสคูปอง","ส่วนลด","วันที่แลก","สถานะ"].map(h => (
                            <th key={h} style={{ padding:"12px 18px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #ede9e3", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {couponItems.map((c, i) => {
                          const rowNum = (couponPage - 1) * COUPON_PER_PAGE + i + 1;
                          return (
                          <tr key={c.redeem_id} style={{ borderBottom:"1px solid #f4f0ec", background: i % 2 === 0 ? "#fff" : "#faf8f5", opacity: c.is_used ? 0.6 : 1 }}>
                            <td style={{ padding:"12px 18px", color:"#94a3b8", fontWeight:600, fontSize:13 }}>{rowNum}</td>
                            <td style={{ padding:"12px 18px", fontWeight:700, fontSize:14, color:"#0f172a" }}>{c.reward_name}</td>
                            <td style={{ padding:"12px 18px" }}>
                              <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:800, padding:"4px 12px", borderRadius:8, background: c.is_used ? "#f4f0ec" : "linear-gradient(135deg,#fff5ec,#ffecd6)", color: c.is_used ? "#b0a090" : "#5c2c08", border:`1px solid ${c.is_used ? "#e2e8f0" : "#e8b895"}` }}>
                                {c.coupon_code}
                              </span>
                            </td>
                            <td style={{ padding:"12px 18px", fontWeight:800, fontSize:14, color: c.is_used ? "#94a3b8" : "#8d4d11" }}>
                              {c.discount_amount > 0 ? `-฿${c.discount_amount}` : "—"}
                            </td>
                            <td style={{ padding:"12px 18px", fontSize:13, color:"#64748b", whiteSpace:"nowrap" }}>
                              {new Date(c.redemption_date).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' })}
                            </td>
                            <td style={{ padding:"12px 18px" }}>
                              <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:999, background: c.is_used ? "rgba(100,116,139,0.1)" : "rgba(34,197,94,0.12)", color: c.is_used ? "#64748b" : "#16a34a", border:`1px solid ${c.is_used ? "#e2e8f0" : "rgba(34,197,94,0.3)"}` }}>
                                <span style={{ width:6, height:6, borderRadius:"50%", background: c.is_used ? "#94a3b8" : "#22c55e", display:"inline-block" }} />
                                {c.is_used ? "ใช้แล้ว" : "ยังไม่ได้ใช้"}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {couponTotalPages > 1 && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"16px 20px", borderTop:"1px solid #f4f0ec", flexWrap:"wrap" }}>
                      <button onClick={() => setCouponPage(p => Math.max(1, p - 1))} disabled={couponPage === 1}
                        style={{ width:34, height:34, borderRadius:10, border:"1.5px solid #ede9e3", background: couponPage===1?"#faf8f5":"#fff", color: couponPage===1?"#d4c8bb":"#5c4a38", cursor: couponPage===1?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, transition:"all 0.15s" }}
                      >‹</button>
                      {Array.from({ length: couponTotalPages }, (_, i) => i + 1).map(page => {
                        const isActive = page === couponPage;
                        const show = page === 1 || page === couponTotalPages || Math.abs(page - couponPage) <= 1;
                        const showEllipsisBefore = page === couponPage - 2 && couponPage > 3;
                        const showEllipsisAfter  = page === couponPage + 2 && couponPage < couponTotalPages - 2;
                        if (showEllipsisBefore || showEllipsisAfter) return <span key={page} style={{ color:"#b0a090", fontSize:14, padding:"0 2px" }}>…</span>;
                        if (!show) return null;
                        return (
                          <button key={page} onClick={() => setCouponPage(page)}
                            style={{ width:34, height:34, borderRadius:10, border: isActive?"1.5px solid #8d4d11":"1.5px solid #ede9e3", background: isActive?"#8d4d11":"#fff", color: isActive?"#fff":"#5c4a38", cursor:"pointer", fontSize:13, fontWeight: isActive?800:500, transition:"all 0.15s", boxShadow: isActive?"0 4px 12px rgba(141,77,17,0.35)":"none" }}
                          >{page}</button>
                        );
                      })}
                      <button onClick={() => setCouponPage(p => Math.min(couponTotalPages, p + 1))} disabled={couponPage === couponTotalPages}
                        style={{ width:34, height:34, borderRadius:10, border:"1.5px solid #ede9e3", background: couponPage===couponTotalPages?"#faf8f5":"#fff", color: couponPage===couponTotalPages?"#d4c8bb":"#5c4a38", cursor: couponPage===couponTotalPages?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, transition:"all 0.15s" }}
                      >›</button>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* ── Redemption history ──────────────────────────────── */}
            {history.length > 0 && (() => {
              const totalPages = Math.ceil(history.length / HISTORY_PER_PAGE);
              const pageItems  = history.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE);
              return (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <div style={{ width:4, height:22, borderRadius:2, background:"linear-gradient(to bottom,#8d4d11,#6b3a0d)" }} />
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#8d4d11", letterSpacing:"0.12em", textTransform:"uppercase" }}>ย้อนหลัง</p>
                    </div>
                    <h2 className="gp-h2" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", fontWeight: 800, margin: 0 }}>📜 ประวัติการแลกแต้ม</h2>
                  </div>
                  <span style={{ fontSize:12, color:"#b0a090", fontWeight:500 }}>{history.length} รายการ</span>
                </div>
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#faf8f5" }}>
                          {["รางวัล", "แต้มที่ใช้", "รหัสคูปอง", "วันที่แลก"].map(h => (
                            <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #ede9e3" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f4f0ec" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#faf8f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "14px 20px", fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{item.reward_name || "—"}</td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff0db", color: "#5c2c08", fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>
                                ⭐ {item.points_spent}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 13, color: "#8d4d11", fontWeight: 600 }}>{item.coupon_code || "—"}</td>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748b" }}>
                              {new Date(item.redemption_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"16px 20px", borderTop:"1px solid #f4f0ec", flexWrap:"wrap" }}>
                      {/* Prev */}
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        style={{ width:34, height:34, borderRadius:10, border:"1.5px solid #ede9e3", background: historyPage===1?"#faf8f5":"#fff", color: historyPage===1?"#d4c8bb":"#5c4a38", cursor: historyPage===1?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, transition:"all 0.15s" }}
                      >‹</button>

                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const isActive = page === historyPage;
                        const show = page === 1 || page === totalPages || Math.abs(page - historyPage) <= 1;
                        const showEllipsisBefore = page === historyPage - 2 && historyPage > 3;
                        const showEllipsisAfter  = page === historyPage + 2 && historyPage < totalPages - 2;
                        if (showEllipsisBefore || showEllipsisAfter) {
                          return <span key={page} style={{ color:"#b0a090", fontSize:14, padding:"0 2px" }}>…</span>;
                        }
                        if (!show) return null;
                        return (
                          <button key={page} onClick={() => setHistoryPage(page)}
                            style={{ width:34, height:34, borderRadius:10, border: isActive?"1.5px solid #8d4d11":"1.5px solid #ede9e3", background: isActive?"#8d4d11":"#fff", color: isActive?"#fff":"#5c4a38", cursor:"pointer", fontSize:13, fontWeight: isActive?800:500, transition:"all 0.15s", boxShadow: isActive?"0 4px 12px rgba(141,77,17,0.35)":"none" }}
                          >{page}</button>
                        );
                      })}

                      {/* Next */}
                      <button
                        onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                        disabled={historyPage === totalPages}
                        style={{ width:34, height:34, borderRadius:10, border:"1.5px solid #ede9e3", background: historyPage===totalPages?"#faf8f5":"#fff", color: historyPage===totalPages?"#d4c8bb":"#5c4a38", cursor: historyPage===totalPages?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, transition:"all 0.15s" }}
                      >›</button>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}
          </>
        ) : (
          /* ── Active game ──────────────────────────────────────── */
          <div className="gp-card-enter">
            {/* Game header */}
            {(() => {
              const g = GAME_CARDS.find(g => g.key === selectedGame);
              return (
                <div style={{
                  background: `linear-gradient(135deg,${g.col}15 0%,${g.col}08 100%)`,
                  border: `1.5px solid ${g.col}25`,
                  borderRadius: 22, padding: "18px 24px", marginBottom: 24,
                  display:"flex", alignItems:"center", gap:16,
                }}>
                  <button
                    onClick={() => setSelectedGame(null)}
                    style={{
                      display:"flex", alignItems:"center", gap:6, background:"#fff",
                      border:"1.5px solid #e2e8f0", borderRadius:12, padding:"9px 18px",
                      fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569",
                      boxShadow:"0 2px 6px rgba(0,0,0,0.06)", flexShrink:0,
                      transition:"all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background="#fff8f0"; e.currentTarget.style.transform="translateX(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.transform="translateX(0)"; }}
                  >
                    ← กลับ
                  </button>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:14, background:`${g.col}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:`1.5px solid ${g.col}30` }}>
                      {g.emoji}
                    </div>
                    <div>
                      <h2 className="gp-h2" style={{ margin:0, fontSize:18, fontWeight:800 }}>{g.label}</h2>
                      <p style={{ margin:0, fontSize:12, color:"#64748b", marginTop:2 }}>{g.sub}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Game component */}
            {selectedGame === "step" ? (
              <div style={{ borderRadius:22, overflow:"hidden" }}>
                <GameStepCounter />
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 22, padding: 28, border: "1px solid #ede9e3", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                {selectedGame === "buy"  && <GameBuyProduct onPointsChanged={(p) => setTotalPoints(p)} />}
                {selectedGame === "quiz" && <GameQuiz />}
              </div>
            )}
          </div>
        )}
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── Game Select Card ───────────────────────────────────────────── */
function GameSelectCard({ game, onSelect }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 24,
        border: `1.5px solid ${hov ? "transparent" : `${game.col}28`}`,
        cursor: "pointer", padding: "0",
        background: hov
          ? `linear-gradient(140deg,${game.col} 0%,${game.dark} 100%)`
          : "#fff",
        textAlign: "left", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: hov ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hov
          ? `0 24px 56px ${game.col}45`
          : `0 4px 20px rgba(0,0,0,0.08)`,
        position: "relative", overflow: "hidden", width: "100%",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Always-visible color top bar */}
      <div style={{ height: 5, background: `linear-gradient(90deg,${game.col},${game.dark})`, borderRadius: "22px 22px 0 0", flexShrink: 0, transition: "opacity 0.3s", opacity: hov ? 0 : 1 }} />

      {/* Decorative circles */}
      <div style={{ position:"absolute", right:-30, top:-30, width:140, height:140, borderRadius:"50%", background: hov ? "rgba(255,255,255,0.08)" : `${game.col}06`, pointerEvents:"none", transition:"all 0.3s" }} />
      <div style={{ position:"absolute", right:20, bottom:-40, width:100, height:100, borderRadius:"50%", background: hov ? "rgba(255,255,255,0.05)" : `${game.col}04`, pointerEvents:"none", transition:"all 0.3s" }} />

      <div style={{ padding: "24px 26px 28px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Emoji icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: hov ? "rgba(255,255,255,0.22)" : `${game.col}16`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, marginBottom: 18, transition: "all 0.3s",
          transform: hov ? "scale(1.12) rotate(-4deg)" : "scale(1) rotate(0deg)",
          boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.18)` : `0 4px 12px ${game.col}20`,
          border: `1.5px solid ${hov ? "rgba(255,255,255,0.28)" : `${game.col}22`}`,
        }}>
          {game.emoji}
        </div>

        <p style={{ margin:"0 0 6px", fontWeight:800, fontSize:18, color: hov ? "#fff" : "#1a0f08", lineHeight:1.3 }}>{game.label}</p>
        <p style={{ margin:"0 0 20px", fontSize:13, color: hov ? "rgba(255,255,255,0.78)" : "#7a6550", lineHeight:1.65, flex:1 }}>{game.sub}</p>

        <span style={{
          display:"inline-flex", alignItems:"center", gap:6, alignSelf:"flex-start",
          background: hov ? "rgba(255,255,255,0.22)" : `${game.col}12`,
          color: hov ? "#fff" : game.col,
          borderRadius:999, padding:"8px 18px", fontSize:13, fontWeight:700,
          border: hov ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${game.col}30`,
          transition:"all 0.2s",
        }}>
          เล่นเลย
          <span style={{ transition:"transform 0.2s", transform: hov ? "translateX(4px)" : "none", display:"inline-block" }}>→</span>
        </span>
      </div>
    </button>
  );
}

/* ─── Reward Card ────────────────────────────────────────────────── */
function RewardCard({ reward, icon, canAfford, redeeming, onRedeem }) {
  const [hov, setHov] = useState(false);
  const outOfStock = reward.max_redemptions != null && (reward.total_redeemed || 0) >= reward.max_redemptions;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 22, padding: "20px 24px",
        border: `1.5px solid ${hov && canAfford ? "#e8c4a0" : canAfford ? "#fff0db" : "#ede9e3"}`,
        boxShadow: hov
          ? canAfford ? "0 16px 40px rgba(141,77,17,0.18)" : "0 12px 32px rgba(0,0,0,0.08)"
          : "0 2px 10px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", alignItems: "center", gap: 18,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Glow strip for affordable rewards */}
      {canAfford && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4, background:"linear-gradient(to bottom,#8d4d11,#6b3a0d)", borderRadius:"22px 0 0 22px" }} />}

      {/* Icon */}
      <div style={{
        width:68, height:68, borderRadius:18, flexShrink:0,
        background: canAfford ? "linear-gradient(135deg,#fff5f0,#e8c4a0)" : "#faf8f5",
        border: `1.5px solid ${canAfford ? "#e8b895" : "#ede9e3"}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:32,
        boxShadow: canAfford ? "0 4px 14px rgba(141,77,17,0.2)" : "none",
        transition:"all 0.25s",
        transform: hov ? "scale(1.08) rotate(-3deg)" : "none",
      }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <h4 className="gp-h2" style={{ margin:"0 0 4px", fontWeight:800, fontSize:15 }}>{reward.name}</h4>
        <p style={{ margin:"0 0 10px", fontSize:13, color:"#64748b", lineHeight:1.5 }}>{reward.description}</p>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:4,
            background: canAfford ? "linear-gradient(135deg,#fff0db,#fff0db)" : "#faf8f5",
            color: canAfford ? "#5c2c08" : "#94a3b8",
            fontSize:13, fontWeight:800, padding:"5px 14px", borderRadius:999,
            border: `1.5px solid ${canAfford ? "#e8b895" : "#e2e8f0"}`,
          }}>
            ⭐ {reward.points_required} แต้ม
          </span>
          {canAfford && <span style={{ fontSize:11, color:"#166534", fontWeight:700, background:"#f0fdf4", padding:"3px 10px", borderRadius:6, border:"1px solid #86efac" }}>✓ แต้มพอ</span>}
          {reward.max_redemptions != null && (
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:6,
              background: reward.total_redeemed >= reward.max_redemptions ? "#fef2f2" : "#f0fdf4",
              color: reward.total_redeemed >= reward.max_redemptions ? "#991b1b" : "#15803d",
              border: `1px solid ${reward.total_redeemed >= reward.max_redemptions ? "#fca5a5" : "#86efac"}`,
            }}>
              {reward.total_redeemed >= reward.max_redemptions ? '🔒 หมดแล้ว' : `🎟️ เหลือ ${reward.max_redemptions - (reward.total_redeemed || 0)} ใบ`}
            </span>
          )}
          {reward.expiration_date && (
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:6,
              background: "#f0e7ff",
              color: "#6d28d9",
              border: "1px solid #c4b5fd",
              display:"inline-flex", alignItems:"center", gap:4,
            }}>
              ⏰ {(() => {
                try {
                  const d = new Date(reward.expiration_date);
                  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                  return reward.expiration_date;
                }
              })()}
            </span>
          )}
        </div>
      </div>

      {/* Button */}
      <button className={canAfford && !outOfStock ? "gp-btn" : ""} onClick={onRedeem} disabled={!canAfford || redeeming || outOfStock}
        style={{
          padding:"12px 22px", borderRadius:14, border:"none", flexShrink:0,
          background: canAfford
            ? "linear-gradient(135deg,#8d4d11,#6b3a0d)"
            : "#f4f0ec",
          color: canAfford ? "#fff" : "#9a8878",
          fontWeight:800, fontSize:13,
          cursor: canAfford && !redeeming ? "pointer" : "not-allowed",
          boxShadow: canAfford ? "0 6px 18px rgba(141,77,17,0.38)" : "none",
          transition:"all 0.2s", opacity: redeeming ? 0.7 : 1, whiteSpace:"nowrap",
          transform: hov && canAfford && !redeeming ? "scale(1.04)" : "scale(1)",
        }}
      >
        {redeeming ? "⏳ กำลังแลก..." : outOfStock ? "🔒 หมดแล้ว" : canAfford ? "🎁 แลกเลย" : "🔒 แต้มไม่พอ"}
      </button>
    </div>
  );
}

/* ─── Alert ──────────────────────────────────────────────────────── */
function Alert({ type, msg }) {
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isSuccess ? "#f0fdf4" : "#fff8f0",
      border: `1px solid ${isSuccess ? "#86efac" : "rgba(141,77,17,0.25)"}`,
      borderRadius: 12, padding: "14px 20px", marginBottom: 24,
      color: isSuccess ? "#166534" : "#6b3a0d",
      fontWeight: 500, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line",
    }}>
      {msg}
    </div>
  );
}
