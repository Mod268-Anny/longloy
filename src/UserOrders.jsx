// ============================================================
// UserOrders.jsx — หน้าประวัติคำสั่งซื้อของผู้ใช้
//
// หน้าที่: แสดงรายการออเดอร์ทั้งหมดของผู้ใช้ที่ล็อกอินอยู่
//
// ส่วนที่มี:
//   - กรองตามสถานะ (ทั้งหมด / รอยืนยัน / สำเร็จ / ยกเลิก ฯลฯ)
//   - Stepper สถานะแต่ละออเดอร์
//   - กด "ดูรายละเอียด" → navigate("/order/:order_id")
//   - Pagination ทีละ 10 รายการ
//
// API: GET /my-orders (ต้องมี JWT token)
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowsRotate, FaBan, FaBasketShopping, FaCircleCheck, FaLock, FaMagnifyingGlass, FaMoneyBillWave, FaTriangleExclamation, FaXmark } from 'react-icons/fa6';
import API_URL, { secureLocalFetch } from './config';
import Footer from './Footer';
import Navbar from './Navbar';

const PAGE_SIZE = 10;

const STATUS_MAP = {
  awaitingpayment: { bg: '#fff8f0', border: 'rgba(141,77,17,0.3)', color: '#5c2c08', label: 'รอยืนยันออเดอร์' },
  pending:         { bg: '#fff8f0', border: 'rgba(141,77,17,0.3)', color: '#5c2c08', label: 'รอยืนยันออเดอร์' },
  confirmed:       { bg: '#f0fff8', border: '#86efac',             color: '#166534', label: 'ยืนยันออเดอร์แล้ว' },
  cooking:         { bg: '#fff8f0', border: 'rgba(141,77,17,0.4)', color: '#6b3a0d', label: 'กำลังจัดเตรียม' },
  completed:       { bg: '#f0fdf4', border: '#86efac',             color: '#15803d', label: 'สำเร็จ' },
  cancelled:       { bg: '#fef2f2', border: '#fca5a5',             color: '#991b1b', label: 'ยกเลิก' },
};
const getStatus = (s) => STATUS_MAP[(s || 'pending').toLowerCase()] || STATUS_MAP.pending;

const STEP_LABELS = ['รอยืนยัน', 'ยืนยัน', 'จัดเตรียม', 'สำเร็จ'];
const STATUS_STEP_IDX = { awaitingpayment: 0, pending: 0, confirmed: 1, cooking: 2, completed: 3, cancelled: -1 };

function MiniOrderStepper({ status }) {
  const key    = (status || '').toLowerCase();
  const active = STATUS_STEP_IDX[key] ?? 0;
  if (key === 'cancelled') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
      {STEP_LABELS.map((label, i) => {
        const done   = i < active;
        const isAct  = i === active;
        const color  = done ? '#22c55e' : isAct ? '#8d4d11' : '#d4c8bb';
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${color}`, background: done ? '#22c55e' : isAct ? '#fff8f0' : '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: done ? '#fff' : color, fontWeight: 800, transition: 'all 0.3s' }}>
                {done ? <FaCircleCheck /> : i + 1}
              </div>
              <span style={{ fontSize: 9, marginTop: 4, color: done ? '#16a34a' : isAct ? '#8d4d11' : '#b0a090', fontWeight: isAct ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < active ? '#22c55e' : '#e8e2db', borderRadius: 1, marginBottom: 14, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
const fmt  = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);
const fmtD = (d) => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CANCELLABLE = ['awaitingpayment', 'pending', 'cooking'];

export default function UserOrders() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('all');
  const [sortDir,     setSortDir]     = useState('desc');
  const [page,        setPage]        = useState(1);
  const [cancelling,  setCancelling]  = useState(null);
  const [cancelModal, setCancelModal] = useState(null); // order object
  const navigate = useNavigate();

  const fetchOrders = () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    secureLocalFetch(`${API_URL}/user-orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setOrders(status === 200 && Array.isArray(data.orders) ? data.orders : []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setTokenStatus('missing'); setLoading(false); setTimeout(() => navigate('/'), 500); return; }
    setTokenStatus('valid');
    fetchOrders();
    const iv = setInterval(fetchOrders, 30000);
    return () => clearInterval(iv);
  }, []);

  const cancelOrder = async (order) => {
    setCancelling(order.order_id);
    try {
      const token = localStorage.getItem('token');
      const res = await secureLocalFetch(`${API_URL}/orders/${order.order_id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { setCancelModal(null); fetchOrders(); }
      else alert(data.error || 'ยกเลิกออเดอร์ไม่สำเร็จ');
    } catch { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    finally { setCancelling(null); }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return orders
      .filter(o => {
        if (filterStatus === 'all') return true;
        const st = (o.status || '').toLowerCase();
        if (filterStatus === 'pending') return st === 'pending' || st === 'awaitingpayment';
        return st === filterStatus;
      })
      .filter(o => !q ||
        String(o.order_id).includes(q) ||
        (o.shop_name || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const diff = new Date(a.created_at) - new Date(b.created_at);
        return sortDir === 'desc' ? -diff : diff;
      });
  }, [orders, filterStatus, q, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (tokenStatus === 'missing') return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12, display:'flex', justifyContent:'center' }}><FaLock /></div>
        <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>กรุณาเข้าสู่ระบบก่อน</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f4f2ef', minHeight: '100vh', color: '#0f172a' }}>
      <Navbar />
      <main className="rsp-main" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            ← ย้อนกลับ
          </button>
          <button onClick={fetchOrders} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaArrowsRotate />{refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช'}</span>
          </button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#8d4d11', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ประวัติ</p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#3d1a05', display:'flex', alignItems:'center', gap:10 }}><FaBasketShopping />คำสั่งซื้อของฉัน</h1>
        </div>

        {/* Stats */}
        {!loading && orders.length > 0 && (
          <div className="rsp-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'ทั้งหมด',        value: orders.length,                                                                    color: '#4b8ff4', bg: '#edf3ff' },
              { label: 'กำลังจัดเตรียม', value: orders.filter(o => o.status?.toLowerCase() === 'cooking').length,                color: '#1a3a6e', bg: '#e0ecfd' },
              { label: 'เสร็จสิ้น',      value: orders.filter(o => o.status?.toLowerCase() === 'completed').length,              color: '#15803d', bg: '#f0fdf4' },
              { label: 'ยกเลิก',         value: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length,              color: '#991b1b', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8', pointerEvents: 'none', display:'flex' }}><FaMagnifyingGlass /></span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="ค้นหาเลขออเดอร์ หรือชื่อร้านค้า..."
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 36, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', display:'flex' }}><FaXmark /></button>
            )}
          </div>
          <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1); }}
            style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {sortDir === 'desc' ? '↓ ใหม่สุด' : '↑ เก่าสุด'}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="rsp-tabs" style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            ['all',            'ทั้งหมด'],
            ['pending',        'รอยืนยัน'],
            ['confirmed',      'ยืนยันแล้ว'],
            ['cooking',        'จัดเตรียม'],
            ['completed',      'สำเร็จ'],
            ['cancelled',      'ยกเลิก'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => { setFilterStatus(k); setPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                borderColor: filterStatus === k ? '#4b8ff4' : '#e2e8f0',
                background:  filterStatus === k ? '#edf3ff' : '#fff',
                color:       filterStatus === k ? '#4b8ff4' : '#64748b',
              }}>{l}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>...</div>
            <p style={{ fontWeight: 600 }}>กำลังโหลดคำสั่งซื้อ...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 56, marginBottom: 12, display:'flex', justifyContent:'center', color:'#94a3b8' }}><FaBasketShopping /></div>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>ยังไม่มีคำสั่งซื้อ</p>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>มาสั่งซื้อสินค้าจากตลาดลอยน้ำกัน!</p>
            <button onClick={() => navigate('/market')}
              style={{ padding: '12px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(75,143,244,0.3)' }}>
              ไปช็อปปิ้ง →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 40, marginBottom: 10, display:'flex', justifyContent:'center', color:'#94a3b8' }}><FaMagnifyingGlass /></div>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>ไม่พบออเดอร์ที่ตรงกัน</p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
          </div>
        ) : (
          <>
            {q && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                พบ <strong>{filtered.length}</strong> ออเดอร์ที่ตรงกับ "<strong>{q}</strong>"
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paged.map(order => {
                const s = getStatus(order.status);
                const isCancellable = CANCELLABLE.includes((order.status || '').toLowerCase());
                return (
                  <div key={order.order_id}
                    style={{ background: '#fff', borderRadius: 20, border: '1px solid #ede9e3', padding: '18px 22px', boxShadow: '0 2px 10px rgba(141,77,17,0.07)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(141,77,17,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(141,77,17,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/order-detail/${order.order_id}`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#3d1a05' }}>#{order.order_id}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {s.label}
                          </span>
                          {order.payment_method === 'cash'
                            ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', display:'inline-flex', alignItems:'center', gap:5 }}><FaMoneyBillWave />เงินสด</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fff8f0', color: '#6b3a0d', border: '1px solid rgba(141,77,17,0.25)' }}>บัตร</span>
                          }
                        </div>
                        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 600, color: '#5c4a38' }}>{order.shop_name || 'ร้านค้า'}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#b89a7a' }}>{fmtD(order.created_at)} · {order.item_count || 0} รายการ</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#8d4d11' }}>{fmt(order.total_amount)}</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => navigate(`/order-detail/${order.order_id}`)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #ede9e3', background: '#fff8f0', color: '#6b3a0d', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            ดูรายละเอียด →
                          </button>
                          {isCancellable && (
                            <button onClick={() => setCancelModal(order)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff5f5', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              ยกเลิก
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mini stepper */}
                    <MiniOrderStepper status={order.status} />
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#cbd5e1' : '#475569', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                  const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                  const dotBefore = p === 2 && page > 3;
                  const dotAfter  = p === totalPages - 1 && page < totalPages - 2;
                  return (
                    <React.Fragment key={p}>
                      {dotBefore && <span style={{ color: '#cbd5e1', fontWeight: 700, lineHeight: 1 }}>•••</span>}
                      {show && (
                        <button onClick={() => setPage(p)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: p === page ? 'none' : '1px solid #e2e8f0', background: p === page ? '#4b8ff4' : '#fff', color: p === page ? '#fff' : '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: p === page ? '0 3px 10px rgba(75,143,244,0.35)' : 'none', transition: 'all 0.15s' }}>
                          {p}
                        </button>
                      )}
                      {dotAfter && <span style={{ color: '#cbd5e1', fontWeight: 700, lineHeight: 1 }}>•••</span>}
                    </React.Fragment>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#cbd5e1' : '#475569', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
            </p>
          </>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setCancelModal(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 24, padding: '28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 10, display:'flex', justifyContent:'center', color:'#ef4444' }}><FaBan /></div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>ยืนยันยกเลิกออเดอร์?</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ออเดอร์ <strong>#{cancelModal.order_id}</strong> จาก <strong>{cancelModal.shop_name || 'ร้านค้า'}</strong></p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>ยอดรวม <strong style={{ color: '#4b8ff4' }}>{fmt(cancelModal.total_amount)}</strong></p>
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#9a3412', fontWeight: 500 }}>
              การยกเลิกออเดอร์ไม่สามารถเปลี่ยนกลับได้ กรุณาตรวจสอบก่อนยืนยัน
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCancelModal(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ไม่ยกเลิก
              </button>
              <button onClick={() => cancelOrder(cancelModal)} disabled={cancelling === cancelModal.order_id}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: cancelling === cancelModal.order_id ? '#e2e8f0' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: cancelling === cancelModal.order_id ? '#94a3b8' : '#fff', fontSize: 14, fontWeight: 700, cursor: cancelling === cancelModal.order_id ? 'not-allowed' : 'pointer', boxShadow: cancelling === cancelModal.order_id ? 'none' : '0 4px 14px rgba(239,68,68,0.35)' }}>
                {cancelling === cancelModal.order_id ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
