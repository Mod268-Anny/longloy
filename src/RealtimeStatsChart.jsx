// ============================================================
// RealtimeStatsChart.jsx — กราฟสถิติแบบ Realtime (Socket.io)
//
// หน้าที่: แสดงกราฟสถิติออเดอร์และรายได้แบบ realtime
//
// ใช้: Socket.io (io จาก socket.io-client) รับ event จาก server ทุก 6 วินาที
// กราฟ: AreaChart (ยอดขายตามเวลา), BarChart (สถิติตามตลาด)
// Library: recharts
//
// ใช้ใน: AdminDashboard.jsx tab "dashboard"
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaUsers, FaBriefcase, FaStore, FaCartShopping, FaRotateRight, FaTriangleExclamation, FaMapLocationDot, FaChartLine, FaChartColumn, FaMoneyBillWave, FaBagShopping } from 'react-icons/fa6';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { io } from 'socket.io-client';
import API_URL, { secureLocalFetch } from './config';

const MARKET_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444',
];

function MarketStatsSection({ token }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState('all');

  const load = () => {
    setLoading(true);
    secureLocalFetch(`${API_URL}/admin/realtime-stats/markets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const allMarkets   = data?.markets ?? [];
  const marketNames  = allMarkets.map(m => m.name);
  const displayList  = selected === 'all' ? allMarkets : allMarkets.filter(m => m.name === selected);
  const maxOrders    = Math.max(1, ...allMarkets.map(m => m.orders));

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24, marginTop: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>MARKETS</p>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><FaMapLocationDot /> ยอดขายรายตลาดน้ำ</h3>
        </div>
        <button onClick={load} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FaRotateRight /> รีเฟรช
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setSelected('all')}
          style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: selected === 'all' ? 'linear-gradient(135deg,#f59e0b,#f97316)' : '#f1f5f9', color: selected === 'all' ? '#fff' : '#475569', boxShadow: selected === 'all' ? '0 2px 8px rgba(245,158,11,0.3)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FaMapLocationDot /> ทั้งหมด
        </button>
        {marketNames.map((name, i) => (
          <button key={name} onClick={() => setSelected(name)}
            style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selected === name ? MARKET_COLORS[i % MARKET_COLORS.length] : '#f1f5f9', color: selected === name ? '#fff' : '#475569', boxShadow: selected === name ? `0 2px 8px ${MARKET_COLORS[i % MARKET_COLORS.length]}55` : 'none', transition: 'all 0.2s' }}>
            {name}
          </button>
        ))}
      </div>

      {/* Total badge */}
      {selected === 'all' && !loading && data && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '7px 14px', marginBottom: 14 }}>
          <span style={{ fontSize: 16, display: 'flex', alignItems: 'center' }}><FaCartShopping /></span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
            คำสั่งซื้อรวมทุกตลาด:{' '}
            <span style={{ fontSize: 17, color: '#f59e0b' }}>{data.total?.toLocaleString() ?? '—'}</span>
          </span>
        </div>
      )}

      {/* Bars */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 32, borderRadius: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaTriangleExclamation /> โหลดข้อมูลไม่สำเร็จ</div>
      ) : displayList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>ไม่พบข้อมูลตลาดนี้</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayList.map((market, i) => {
            const colorIdx = marketNames.indexOf(market.name);
            const color    = MARKET_COLORS[colorIdx % MARKET_COLORS.length] ?? '#6366f1';
            const pct      = (market.orders / maxOrders) * 100;
            return (
              <div key={market.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{market.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{market.orders.toLocaleString()} คำสั่งซื้อ</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', minWidth: market.orders > 0 ? 6 : 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const C = {
  users:      '#4b8ff4',
  tourists:   '#4b8ff4',
  businesses: '#8d4d11',
  orders:     '#4b8ff4',
  revenue:    '#f43f5e',
  grid:       '#f1f5f9',
};

const USER_SERIES = [
  { key: 'ผู้ใช้ทั้งหมด', color: C.users,      stat: 'totalUsers',  label: 'ผู้ใช้ทั้งหมด', icon: <FaUsers size={16} /> },
  { key: 'นักท่องเที่ยว', color: C.tourists,    stat: 'tourists',    label: 'นักท่องเที่ยว', icon: <FaBriefcase size={16} /> },
  { key: 'ผู้ประกอบการ',  color: C.businesses,  stat: 'businesses',  label: 'ผู้ประกอบการ',  icon: <FaStore size={16} /> },
];

const ORDER_SERIES = [
  { key: 'คำสั่งซื้อ', color: C.orders,  stat: 'orders',  label: 'คำสั่งซื้อ', icon: <FaCartShopping size={16} /> },
];

const PERIOD_ORDER_SERIES = [
  { key: 'orders',  color: C.orders,  label: 'คำสั่งซื้อ' },
  { key: 'revenue', color: C.revenue, label: 'ยอดขาย (฿)' },
];
const PERIOD_USER_SERIES = [
  { key: 'new_users',         color: C.users,      label: 'ผู้ใช้ใหม่' },
  { key: 'new_tourists',      color: C.tourists,   label: 'นักท่องเที่ยวใหม่' },
  { key: 'new_entrepreneurs', color: C.businesses, label: 'ผู้ประกอบการใหม่' },
];

const MAX_POINTS = 20;
const PERIODS = [
  { key: 'live', label: 'LIVE' },
  { key: '1d',   label: '1 วัน' },
  { key: '1m',   label: '1 เดือน' },
  { key: '1y',   label: '1 ปี' },
];

function Tooltip_({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#0f172a' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
          {p.name}: <span style={{ color: '#334155' }}>{p.dataKey === 'revenue' ? `฿${Number(p.value).toLocaleString()}` : p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function MiniCard({ label, value, color, icon, loading, prefix = '' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', borderLeft: `4px solid ${color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: '1 1 120px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      {loading
        ? <div style={{ height: 28, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        : <div style={{ fontSize: 26, fontWeight: 800, color }}>{prefix}{value?.toLocaleString() ?? '—'}</div>
      }
    </div>
  );
}

function ChartBlock({ title, data, series, chartType, height = 220 }) {
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {data.length === 0 ? (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 12 }}>
          ไม่มีข้อมูล
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {series.map(s => (
                  <linearGradient key={s.key} id={`g2-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={s.color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<Tooltip_ />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {series.map(s => (
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5}
                  fill={`url(#g2-${s.key})`} dot={{ r: 2.5, strokeWidth: 2 }} activeDot={{ r: 5 }} name={s.label} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<Tooltip_ />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {series.map(s => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4,4,0,0]} maxBarSize={18} name={s.label} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function RealtimeStatsChart({ token }) {
  const [stats,       setStats]       = useState(null);
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [connected,   setConnected]   = useState(false);
  const [chartType,   setChartType]   = useState('area');
  const [period,      setPeriod]      = useState('live');
  const [periodData,  setPeriodData]  = useState([]);
  const [periodLoad,  setPeriodLoad]  = useState(false);
  const socketRef = useRef(null);

  const pushHistory = useCallback((s) => {
    const now = new Date();
    const label = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setHistory(prev => {
      const next = [...prev, {
        time: label,
        'ผู้ใช้ทั้งหมด': s.totalUsers,
        'นักท่องเที่ยว':  s.tourists,
        'ผู้ประกอบการ':   s.businesses,
        'คำสั่งซื้อ':     s.orders,
      }];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, []);

  useEffect(() => {
    secureLocalFetch(`${API_URL}/admin/realtime-stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d); pushHistory(d); setLoading(false); })
      .catch(() => setLoading(false));

    const socket = io(API_URL || '/', { auth: { token }, transports: ['polling', 'websocket'] });
    socketRef.current = socket;
    socket.on('connect',      () => setConnected(true));
    socket.on('disconnect',   () => setConnected(false));
    socket.on('stats:update', (s) => { setStats(s); pushHistory(s); });
    return () => socket.disconnect();
  }, [token, pushHistory]);

  useEffect(() => {
    if (period === 'live') return;
    setPeriodLoad(true);
    secureLocalFetch(`${API_URL}/admin/stats-period?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPeriodData(Array.isArray(d) ? d.map(r => ({ ...r, time: r.label })) : []))
      .catch(() => setPeriodData([]))
      .finally(() => setPeriodLoad(false));
  }, [period, token]);

  const isLive = period === 'live';
  const periodTotalOrders  = periodData.reduce((s, d) => s + (d.orders  || 0), 0);
  const periodTotalRevenue = periodData.reduce((s, d) => s + (d.revenue || 0), 0);

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes pulse-dot{0%,100%{box-shadow:0 0 0 3px rgba(75,143,244,.2)}50%{box-shadow:0 0 0 6px rgba(75,143,244,.05)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ color: '#4b8ff4', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>
            {isLive ? 'REALTIME' : 'STATISTICS'}
          </p>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaChartColumn /> สถิติ{isLive ? 'เรียลไทม์' : { '1d': '1 วัน', '1m': '1 เดือน', '1y': '1 ปี' }[period]}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
            {isLive ? 'อัปเดตอัตโนมัติผ่าน Socket.io' : { '1d': 'วันนี้ · รายชั่วโมง · รีเซตเที่ยงคืน', '1m': 'เดือนนี้ · รายวัน · รีเซตต้นเดือน', '1y': 'ปีนี้ · รายเดือน · รีเซตต้นปี' }[period]}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Period tabs */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: period === p.key ? 'linear-gradient(135deg,#4b8ff4,#4b8ff4)' : '#fff',
                color: period === p.key ? '#fff' : '#64748b', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {p.key === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#4b8ff4' : '#cbd5e1', display: 'inline-block', animation: connected && period === 'live' ? 'pulse-dot 2s infinite' : 'none' }} />}
                {p.label}
              </button>
            ))}
          </div>

          {/* Chart type */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            {[['area', <FaChartLine />], ['bar', <FaChartColumn />]].map(([type, icon]) => (
              <button key={type} onClick={() => setChartType(type)} style={{
                padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: chartType === type ? 'linear-gradient(135deg,#4b8ff4,#4b8ff4)' : '#fff',
                color: chartType === type ? '#fff' : '#64748b', fontWeight: 600, transition: 'all 0.2s',
              }}>{icon}</button>
            ))}
          </div>
        </div>
      </div>

      {isLive ? (
        <>
          {/* === LIVE: User cards === */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {USER_SERIES.map(s => <MiniCard key={s.key} label={s.label} value={stats?.[s.stat]} color={s.color} icon={s.icon} loading={loading} />)}
            {ORDER_SERIES.map(s => <MiniCard key={s.key} label={s.label} value={stats?.[s.stat]} color={s.color} icon={s.icon} loading={loading} />)}
          </div>

          {/* === LIVE Chart 1: Users === */}
          <div style={{ background: '#fafbff', borderRadius: 14, padding: '16px 12px 8px', marginBottom: 16 }}>
            <ChartBlock title="ผู้ใช้ระบบ" data={history} series={USER_SERIES} chartType={chartType} height={220} />
          </div>

          {/* === LIVE Chart 2: Orders === */}
          <div style={{ background: '#edf3ff', borderRadius: 14, padding: '16px 12px 8px' }}>
            <ChartBlock title="คำสั่งซื้อ" data={history} series={ORDER_SERIES} chartType={chartType} height={180} />
          </div>
        </>
      ) : (
        <>
          {/* === PERIOD: Summary cards === */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <MiniCard label="คำสั่งซื้อรวม"  value={periodTotalOrders}             color={C.orders}     icon={<FaBagShopping />} loading={periodLoad} />
            <MiniCard label="ยอดขายรวม"     value={Math.round(periodTotalRevenue)} color={C.revenue}    icon={<FaMoneyBillWave />} loading={periodLoad} prefix="฿" />
            <MiniCard label="ผู้ใช้ทั้งหมด"  value={stats?.totalUsers}             color={C.users}      icon={<FaUsers />} loading={loading} />
            <MiniCard label="นักท่องเที่ยว"  value={stats?.tourists}               color={C.tourists}   icon={<FaBriefcase />} loading={loading} />
            <MiniCard label="ผู้ประกอบการ"   value={stats?.businesses}             color={C.businesses} icon={<FaStore />} loading={loading} />
          </div>

          {/* === PERIOD Chart 1: Orders === */}
          <div style={{ background: '#edf3ff', borderRadius: 14, padding: '16px 12px 8px', marginBottom: 16 }}>
            <ChartBlock title="คำสั่งซื้อ" data={periodData} series={[PERIOD_ORDER_SERIES[0]]} chartType={chartType} height={200} />
          </div>

          {/* === PERIOD Chart 2: Revenue === */}
          <div style={{ background: '#fff1f2', borderRadius: 14, padding: '16px 12px 8px', marginBottom: 16 }}>
            <ChartBlock title="ยอดขาย (฿)" data={periodData} series={[PERIOD_ORDER_SERIES[1]]} chartType={chartType} height={200} />
          </div>

          {/* === PERIOD Chart 3: New Users === */}
          <div style={{ background: '#fafbff', borderRadius: 14, padding: '16px 12px 8px' }}>
            <ChartBlock title="ผู้ใช้ใหม่" data={periodData} series={PERIOD_USER_SERIES} chartType={chartType} height={200} />
          </div>
        </>
      )}

      {/* ── Market Stats (แสดงเสมอ ทุก period) ── */}
      <MarketStatsSection token={token} />
    </div>
  );
}
