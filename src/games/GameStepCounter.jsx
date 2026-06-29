// ============================================================
// games/GameStepCounter.jsx — เกมนับก้าวเดิน (Step Counter)
//
// หน้าที่: นับก้าวเดินผ่าน DeviceMotion API แล้วแลกเป็นคะแนน
//
// Flow:
//   1. กดปุ่ม "เริ่มนับก้าว" → เปิด DeviceMotionEvent listener
//   2. ตรวจจับการสั่นของมือถือ → นับก้าว (threshold-based)
//   3. เป้าหมาย: STEP_GOAL = 5000 ก้าว/วัน
//   4. POST /user/save-steps → บันทึกก้าว
//   5. POST /user/claim-daily-steps-reward → แลกคะแนนประจำวัน
//
// หมายเหตุ: ใช้ได้เฉพาะบนมือถือที่รองรับ DeviceMotionEvent
// ============================================================
import React from 'react';
import { FaCircleCheck, FaCircleXmark, FaTriangleExclamation, FaCircleStop, FaPersonWalking, FaTrophy } from 'react-icons/fa6';
import API_URL, { secureLocalFetch } from '../config';

export default function GameStepCounter() {
  const STEP_GOAL = 5000;
  const [steps, setSteps] = React.useState(0);
  const [isTracking, setIsTracking] = React.useState(false);
  const [success, setSuccess] = React.useState(null);
  const [rewarded, setRewarded] = React.useState(false);
  const [rewardPoints, setRewardPoints] = React.useState(0);
  const [rewardedToday, setRewardedToday] = React.useState(false);
  const [shakeCount, setShakeCount] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);
  const [stepHistory, setStepHistory] = React.useState([]);
  const [currentPoints, setCurrentPoints] = React.useState(0);
  const [exchangeLoading, setExchangeLoading] = React.useState(false);
  const [exchangeMessage, setExchangeMessage] = React.useState(null);

  const stepCountRef = React.useRef(0);
  const lastStepTimeRef = React.useRef(0);
  const lastAccelRef = React.useRef({ x: 0, y: 0, z: 0 });
  const motionEventCountRef = React.useRef(0);
  const isTrackingRef = React.useRef(false);
  const rewardedTodayRef = React.useRef(false);
  const handleRewardAPIRef = React.useRef(null);
  const shakeThreshold = 15;
  const minStepInterval = 300;

  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua));
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    secureLocalFetch(`${API_URL}/user/step-history`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setStepHistory(d); }).catch(() => {});
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    secureLocalFetch(`${API_URL}/user/points`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then(r => r.json()).then(d => { if (d.success) setCurrentPoints(d.points || 0); }).catch(() => {});
  }, []);

  React.useEffect(() => { rewardedTodayRef.current = rewardedToday; }, [rewardedToday]);

  React.useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/user/daily-step-reward`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const text = await res.text();
        if (text.includes('<!doctype') || text.includes('<html')) return;
        const data = text ? JSON.parse(text) : {};
        if (res.ok) setRewardedToday(data.rewarded || false);
      } catch {}
    };
    check();
  }, []);

  React.useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('stepCounter');
    if (saved) {
      try {
        const { date, count, rewarded } = JSON.parse(saved);
        if (date === today) { stepCountRef.current = count; setSteps(count); setRewardedToday(rewarded); }
        else { localStorage.setItem('stepCounter', JSON.stringify({ date: today, count: 0, rewarded: false })); }
      } catch { localStorage.setItem('stepCounter', JSON.stringify({ date: today, count: 0, rewarded: false })); }
    } else {
      localStorage.setItem('stepCounter', JSON.stringify({ date: today, count: 0, rewarded: false }));
    }
  }, []);

  const saveStepCount = React.useCallback((newCount, isRewarded = false) => {
    const today = new Date().toDateString();
    localStorage.setItem('stepCounter', JSON.stringify({ date: today, count: newCount, rewarded: isRewarded }));
    const token = localStorage.getItem('token');
    if (token) {
      const dateISO = new Date().toISOString().split('T')[0];
      secureLocalFetch(`${API_URL}/user/save-steps`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: newCount, date: dateISO })
      }).catch(() => {});
    }
  }, []);

  const handleRewardAPI = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> ต้องล็อกอินก่อน</span>); setTimeout(() => setSuccess(null), 2000); return; }
      const res = await fetch(`${API_URL}/user/claim-daily-steps-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ steps: stepCountRef.current })
      });
      const text = await res.text();
      if (text.includes('<!doctype') || text.includes('<html')) return;
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (res.ok && data.success) {
        setRewarded(true);
        setRewardPoints(data.reward || 100);
        setRewardedToday(true);
        saveStepCount(stepCountRef.current, true);
        setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaTrophy /> ยินดีด้วย! คุณได้รับ {data.reward || 100} แต้ม</span>);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch {}
  }, [saveStepCount]);

  React.useEffect(() => { handleRewardAPIRef.current = handleRewardAPI; }, [handleRewardAPI]);

  const handleMotion = React.useCallback((event) => {
    if (!isTrackingRef.current) return;
    motionEventCountRef.current += 1;
    const acceleration = event.accelerationIncludingGravity || event.acceleration;
    if (!acceleration) return;
    const { x = 0, y = 0, z = 0 } = acceleration;
    const totalDelta = Math.abs(x - lastAccelRef.current.x) + Math.abs(y - lastAccelRef.current.y) + Math.abs(z - lastAccelRef.current.z);
    if (totalDelta > shakeThreshold) {
      const now = Date.now();
      if (now - lastStepTimeRef.current > minStepInterval) {
        stepCountRef.current += 1;
        setSteps(stepCountRef.current);
        setShakeCount(p => p + 1);
        saveStepCount(stepCountRef.current, rewardedTodayRef.current);
        if (stepCountRef.current >= STEP_GOAL && !rewardedTodayRef.current && handleRewardAPIRef.current) {
          handleRewardAPIRef.current();
        }
        lastStepTimeRef.current = now;
      }
    }
    lastAccelRef.current = { x, y, z };
  }, [saveStepCount]);

  const handleStartTracking = React.useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaTriangleExclamation /> ยังไม่ได้ล็อกอิน — นับก้าวได้ แต่ยังรับแต้มไม่ได้</span>);
        setTimeout(() => setSuccess(null), 2500);
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        alert('⚠️ ขอสิทธิ์เข้าถึงเซ็นเซอร์การเคลื่อนไหว\n\nกดอนุญาต (Allow) ในหน้าต่างถัดไป');
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') return;
      }
      isTrackingRef.current = true;
      window.addEventListener('devicemotion', handleMotion);
      setIsTracking(true);
      setShakeCount(0);
      motionEventCountRef.current = 0;
      setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleCheck /> เริ่มนับก้าวแล้ว! สั่นโทรศัพท์เพื่อนับ</span>);
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> ไม่สามารถเข้าถึงเซ็นเซอร์ได้</span>);
      setTimeout(() => setSuccess(null), 2000);
    }
  }, [handleMotion]);

  const handleStopTracking = React.useCallback(() => {
    isTrackingRef.current = false;
    window.removeEventListener('devicemotion', handleMotion);
    setIsTracking(false);
    setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleStop /> หยุดนับก้าวแล้ว</span>);
    setTimeout(() => setSuccess(null), 2000);
  }, [handleMotion]);

  React.useEffect(() => {
    if (isTrackingRef.current) {
      window.removeEventListener('devicemotion', handleMotion);
      window.addEventListener('devicemotion', handleMotion);
    }
  }, [handleMotion]);

  const handleExchangeStepsToPoints = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setExchangeMessage(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> ต้องล็อกอินก่อน</span>); setTimeout(() => setExchangeMessage(null), 2000); return; }
      if (steps <= 0) { setExchangeMessage(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaTriangleExclamation /> ไม่มีก้าวที่จะแลก</span>); setTimeout(() => setExchangeMessage(null), 2000); return; }
      setExchangeLoading(true);
      const res = await secureLocalFetch(`${API_URL}/user/exchange-steps-to-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ steps })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExchangeMessage(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleCheck /> สำเร็จ! แลก {data.stepsUsed} ก้าว ได้ {data.pointsEarned} แต้ม</span>);
        setCurrentPoints(data.currentPoints);
        stepCountRef.current = 0;
        setSteps(0);
        const today = new Date().toDateString();
        localStorage.setItem('stepCounter', JSON.stringify({ date: today, count: 0, rewarded: rewardedToday }));
        setTimeout(() => setExchangeMessage(null), 3000);
      } else {
        setExchangeMessage(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> {data.message || 'เกิดข้อผิดพลาด'}</span>);
        setTimeout(() => setExchangeMessage(null), 2000);
      }
    } catch (error) {
      setExchangeMessage(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> {error.message}</span>);
      setTimeout(() => setExchangeMessage(null), 2000);
    } finally { setExchangeLoading(false); }
  }, [steps, rewardedToday]);

  const handleManualAddStep = React.useCallback(() => {
    stepCountRef.current += 1;
    setSteps(stepCountRef.current);
    setShakeCount(p => p + 1);
    saveStepCount(stepCountRef.current, rewardedTodayRef.current);
    if (stepCountRef.current >= STEP_GOAL && !rewardedTodayRef.current && handleRewardAPIRef.current) {
      handleRewardAPIRef.current();
    }
  }, [saveStepCount]);

  const handleSaveStepsToDatabase = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> ไม่มี token - กรุณา login ก่อน</span>); setTimeout(() => setSuccess(null), 3000); return; }
      const dateISO = new Date().toISOString().split('T')[0];
      const res = await secureLocalFetch(`${API_URL}/user/save-steps`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: stepCountRef.current, date: dateISO })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleCheck /> บันทึก {stepCountRef.current} ก้าวสำเร็จ!</span>);
        setTimeout(() => setSuccess(null), 3000);
        const histRes = await secureLocalFetch(`${API_URL}/user/step-history`, { headers: { 'Authorization': `Bearer ${token}` } });
        const histData = await histRes.json();
        if (Array.isArray(histData)) setStepHistory(histData);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      setSuccess(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaCircleXmark /> บันทึกไม่สำเร็จ: {error.message}</span>);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, []);

  React.useEffect(() => {
    return () => { isTrackingRef.current = false; window.removeEventListener('devicemotion', handleMotion); };
  }, [handleMotion]);

  /* ── derived ─────────────────────────────────────────────────── */
  const CARD_RADIUS = 62;
  const CARD_CIRC   = 2 * Math.PI * CARD_RADIUS;
  const pct         = Math.min(steps / STEP_GOAL, 1);
  const cardDash    = CARD_CIRC * pct;
  const goal100     = steps >= STEP_GOAL;
  const remaining   = Math.max(0, STEP_GOAL - steps);

  const ringColor = goal100 ? "#22c55e" : "#8d4d11";

  const avgSteps = stepHistory.length > 0
    ? Math.round(stepHistory.reduce((s, r) => s + (r.step_count || 0), 0) / stepHistory.length)
    : 0;

  const alertKind = (msg) => {
    if (typeof msg === 'string') {
      return msg.includes('❌') ? 'error' : msg.includes('⚠️') ? 'warn' : 'success';
    }
    return 'success';
  };
  const alertStyle = {
    error:   { bg: "#fff0e8", border: "#e8b895", color: "#4a2008" },
    warn:    { bg: "#fff8f0", border: "#d4880a", color: "#5c2c08" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
  };

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f4f2ef", minHeight:"100%", paddingBottom:40 }}>
      <style>{`
        @keyframes sc-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
      <div style={{ maxWidth:480, margin:"0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ margin:0, fontSize:11, color:"#b89a7a", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>เกมสะสมก้าว</p>
          <h2 style={{ margin:"2px 0 0", fontSize:20, fontWeight:900, color:"#3d1a05", display:'inline-flex', alignItems:'center', gap:8 }}><FaPersonWalking /> เกมเก็บก้าว</h2>
        </div>
        <div style={{ width:50, height:50, borderRadius:"50%", background:"linear-gradient(135deg,#8d4d11,#6b3a0d)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(141,77,17,0.3)" }}>
          <span style={{ fontSize:14, fontWeight:900, color: goal100 ? "#4ade80" : "#fff", lineHeight:1 }}>{Math.round(pct*100)}%</span>
          <span style={{ fontSize:8, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>ของเป้า</span>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {(success || exchangeMessage || rewarded) && (
        <div style={{ padding:"12px 18px 0", display:"flex", flexDirection:"column", gap:8 }}>
          {[success, exchangeMessage].filter(Boolean).map((msg, i) => {
            const k = alertKind(msg);
            return <div key={i} style={{ padding:"12px 16px", borderRadius:14, fontWeight:600, fontSize:13, border:`1px solid ${alertStyle[k].border}`, background:alertStyle[k].bg, color:alertStyle[k].color }}>{msg}</div>;
          })}
          {rewarded && (
            <div style={{ background:"linear-gradient(135deg,#14532d,#15803d)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>🏆 ได้รับ <strong>{rewardPoints}</strong> แต้ม!</span>
              <button onClick={() => setRewarded(false)} style={{ background:"rgba(255,255,255,0.18)", border:"none", borderRadius:8, padding:"5px 12px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>ปิด</button>
            </div>
          )}
        </div>
      )}

      {/* ── GIANT RING ─────────────────────────────────────────── */}
      <div style={{ padding:"16px 18px 0" }}>
        <div style={{ position:"relative" }}>
          {isTracking && (
            <div style={{ position:"absolute", inset:"10%", borderRadius:"50%", background:`radial-gradient(circle,${ringColor}18 0%,transparent 70%)`, animation:"sc-pulse 2s ease-in-out infinite", pointerEvents:"none" }} />
          )}
          <svg viewBox="0 0 300 300" width="100%" style={{ transform:"rotate(-90deg)", display:"block" }}>
            <circle cx="150" cy="150" r="130" fill="none" stroke="#e8e0d6" strokeWidth="20" />
            <circle cx="150" cy="150" r="130" fill="none"
              stroke={goal100 ? "#22c55e" : "#8d4d11"}
              strokeWidth="20" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*130*pct} ${2*Math.PI*130}`}
              style={{ transition:"stroke-dasharray 0.7s ease, stroke 0.4s", filter: isTracking ? `drop-shadow(0 0 10px rgba(141,77,17,0.5))` : "none" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:"clamp(58px,16vw,88px)", fontWeight:900, color: goal100 ? "#16a34a" : "#3d1a05", lineHeight:1, letterSpacing:"-0.04em" }}>
              {steps.toLocaleString()}
            </span>
            <span style={{ fontSize:16, color:"#b89a7a", fontWeight:700, marginTop:8 }}>ก้าว</span>
            <span style={{ fontSize:12, color:"#c0a882", fontWeight:600, marginTop:4 }}>
              {goal100 ? "🏆 ถึงเป้าแล้ว!" : `เป้า ${STEP_GOAL.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tracking badge ─────────────────────────────────────── */}
      {isTracking && (
        <div style={{ margin:"8px 18px 0", background:"#fff8f0", border:"1.5px solid rgba(141,77,17,0.2)", borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#8d4d11", flexShrink:0, animation:"sc-pulse 1.2s ease-in-out infinite" }} />
          <span style={{ fontSize:13, fontWeight:600, color:"#5c2c08" }}>กำลังติดตาม · สั่น <strong>{shakeCount}</strong> ครั้ง</span>
        </div>
      )}

      {/* ── Start/Stop ─────────────────────────────────────────── */}
      <div style={{ padding:"14px 18px 0" }}>
        <button onClick={isTracking ? handleStopTracking : handleStartTracking} style={{
          width:"100%", padding:"17px", borderRadius:20, border:"none",
          background: isTracking ? "#ef4444" : "linear-gradient(135deg,#8d4d11,#6b3a0d)",
          color:"#fff", fontSize:17, fontWeight:900, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          boxShadow: isTracking ? "0 6px 20px rgba(239,68,68,0.35)" : "0 6px 24px rgba(141,77,17,0.35)",
        }}>
          {isTracking ? "⏹ หยุดนับก้าว" : "▶ เริ่มนับก้าว"}
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, padding:"12px 18px 0" }}>
        {[
          { label:"เฉลี่ย/วัน", value: avgSteps > 0 ? avgSteps.toLocaleString() : "—" },
          { label:"แต้มสะสม",   value: currentPoints.toLocaleString() },
          { label: rewardedToday ? "รางวัล" : "เหลืออีก", value: rewardedToday ? "✓ รับแล้ว" : (goal100 ? "✓ ครบ" : remaining.toLocaleString()), green: rewardedToday || goal100 },
        ].map((s) => (
          <div key={s.label} style={{ background:"#fff", border:"1px solid #ede9e3", borderRadius:16, padding:"12px 8px", textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", fontSize:10, color:"#b89a7a", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
            <p style={{ margin:0, fontSize:15, fontWeight:900, color: s.green ? "#16a34a" : "#3d1a05" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Exchange ───────────────────────────────────────────── */}
      <div style={{ padding:"12px 18px 0" }}>
        <button onClick={handleExchangeStepsToPoints} disabled={exchangeLoading || steps === 0}
          style={{ width:"100%", padding:"15px 20px", borderRadius:18, border:"none",
            background: steps === 0 ? "#e8e3de" : "linear-gradient(135deg,#8d4d11,#6b3a0d)",
            color: steps === 0 ? "#b0a090" : "#fff",
            fontSize:15, fontWeight:800, cursor: steps === 0 ? "not-allowed" : "pointer",
            boxShadow: steps > 0 ? "0 6px 20px rgba(141,77,17,0.35)" : "none",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            opacity: exchangeLoading ? 0.7 : 1,
          }}>
          🎁 {exchangeLoading ? "กำลังแลก..." : steps > 0 ? `แลกก้าวเป็นแต้ม · ${steps.toLocaleString()} ก้าว` : "แลกก้าวเป็นแต้ม"}
        </button>
      </div>

      {/* ── Secondary buttons ──────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, padding:"10px 18px 0" }}>
        {!isMobile && (
          <button onClick={handleManualAddStep}
            style={{ flex:1, padding:"12px", borderRadius:14, border:"1.5px solid #ede9e3", background:"#fff", color:"#6b3a0d", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            ➕ ทดสอบ
          </button>
        )}
        <button onClick={handleSaveStepsToDatabase}
          style={{ flex:1, padding:"12px", borderRadius:14, border:"1.5px solid #ede9e3", background:"#fff", color:"#6b3a0d", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          💾 บันทึกก้าว
        </button>
      </div>

      {/* ── How-to ─────────────────────────────────────────────── */}
      <div style={{ margin:"14px 18px 0", background:"#fff", borderRadius:20, padding:"20px", border:"1px solid #ede9e3" }}>
        <p style={{ margin:"0 0 14px", fontWeight:800, fontSize:14, color:"#3d1a05" }}>💡 วิธีใช้งาน</p>
        {[
          { n:1, t:"เริ่มนับก้าว", d:"กดปุ่มด้านบน" },
          { n:2, t:"สั่นโทรศัพท์", d:"ทุกครั้งที่สั่น = 1 ก้าว" },
          { n:3, t:"รับแต้มอัตโนมัติ", d:`${STEP_GOAL.toLocaleString()} ก้าว = 100 แต้ม/วัน` },
          { n:4, t:"แลกก้าวเป็นแต้ม", d:"10 ก้าว = 1 แต้ม" },
        ].map(({ n, t, d }) => (
          <div key={n} style={{ display:"flex", gap:12, alignItems:"center", marginBottom: n < 4 ? 12 : 0 }}>
            <div style={{ width:28, height:28, borderRadius:9, background:"rgba(141,77,17,0.1)", color:"#8d4d11", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{n}</div>
            <span style={{ fontSize:13, color:"#7a5c40" }}><strong style={{ color:"#3d1a05", fontWeight:700 }}>{t}</strong> — {d}</span>
          </div>
        ))}
        {!isMobile && (
          <div style={{ marginTop:12, padding:"9px 14px", background:"#fff8f0", borderRadius:10, fontSize:12, color:"#5c2c08", fontWeight:600, border:"1px solid rgba(141,77,17,0.12)" }}>
            💻 บนเดสก์ท็อป: ใช้ปุ่ม "ทดสอบ"
          </div>
        )}
      </div>

      {/* ── History ────────────────────────────────────────────── */}
      {stepHistory.length > 0 && (() => {
        const hist = stepHistory.slice(0, 7).reverse();
        const maxS = Math.max(...hist.map(r => r.step_count || 0), 1);
        return (
          <div style={{ margin:"14px 18px 0", background:"#fff", borderRadius:20, padding:"20px", border:"1px solid #ede9e3" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontWeight:800, fontSize:14, color:"#3d1a05" }}>📊 ประวัติ 7 วัน</p>
                <p style={{ margin:0, fontSize:11, color:"#b89a7a" }}>เฉลี่ย {avgSteps.toLocaleString()} ก้าว/วัน</p>
              </div>
              <p style={{ margin:0, fontSize:14, fontWeight:900, color:"#8d4d11" }}>{Math.max(...hist.map(r=>r.step_count||0)).toLocaleString()}</p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:120 }}>
              {hist.map((record, idx) => {
                const h = Math.max(((record.step_count||0)/maxS)*100, 3);
                const day = new Date(record.step_date).toLocaleDateString('th-TH', { weekday:"short" });
                const isToday = idx === hist.length-1;
                const reached = (record.step_count||0) >= STEP_GOAL;
                return (
                  <div key={idx} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                    <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end" }}>
                      <div style={{ width:"100%", height:`${h}%`, minHeight:4, borderRadius:"6px 6px 2px 2px",
                        background: reached ? "#22c55e" : isToday ? "#8d4d11" : "#e8e0d6",
                        transition:"height 0.5s ease",
                      }} />
                    </div>
                    <span style={{ fontSize:9, color: isToday ? "#8d4d11" : "#b89a7a", fontWeight: isToday ? 800 : 400 }}>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
