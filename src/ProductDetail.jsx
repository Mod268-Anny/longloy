import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import { FaChevronLeft } from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import useCartCount from './useCartCount';

const NAV = [
  { label:"หน้าแรก",   icon:<MdHome size={18}/>,                path:"/homepage" },
  { label:"ตลาดน้ำ",   icon:<MdStorefront size={18}/>,           path:"/market"   },
  { label:"เกม",       icon:<MdOutlineSportsEsports size={18}/>, path:"/game"     },
  { label:"ช่วยเหลือ", icon:<MdHelpOutline size={18}/>,          path:"/help"     },
];

const PFALLBACK = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80';

const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;

export default function ProductDetail() {
  const { product_id } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const cartCount = useCartCount();

  const [product,     setProduct]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('description');
  const [qty,         setQty]         = useState(1);
  const [activeImg,   setActiveImg]   = useState(0);
  const [addedMsg,    setAddedMsg]    = useState('');
  const [selectedSize,    setSelectedSize]    = useState(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(null);
  const [related,         setRelated]         = useState([]);

  useEffect(() => {
    setLoading(true);
    secureLocalFetch(`${API_URL}/product-detail/${product_id}`)
      .then(r => r.json())
      .then(d => {
        setProduct(d);
        setLoading(false);
        // auto-select first size
        const sizes = Array.isArray(d.sizes) ? d.sizes : [];
        if (sizes.length > 0) {
          setSelectedSize(sizes[0]);
          setSelectedSizeIdx(0);
        }
      })
      .catch(() => setLoading(false));
  }, [product_id]);

  useEffect(() => {
    if (!product) return;
    const mid = product.market_id;
    if (mid) {
      secureLocalFetch(`${API_URL}/shops/by-market/${mid}`)
        .then(r => r.ok ? r.json() : [])
        .then(shops => Promise.all(
          (Array.isArray(shops) ? shops : []).map(s =>
            secureLocalFetch(`${API_URL}/products/by-shop/${s.shop_id}`)
              .then(r2 => r2.ok ? r2.json() : [])
              .then(d => (Array.isArray(d) ? d : []).map(p => ({ ...p, shop_name: p.shop_name || s.shop_name })))
              .catch(() => [])
          )
        ))
        .then(arr => setRelated(
          arr.flat()
            .filter(p => String(p.product_id) !== String(product.product_id))
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
        ))
        .catch(() => {});
    } else if (product.shop_id) {
      secureLocalFetch(`${API_URL}/products/by-shop/${product.shop_id}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setRelated((Array.isArray(d) ? d : []).filter(p => String(p.product_id) !== String(product.product_id)).slice(0, 8)))
        .catch(() => {});
    }
  }, [product?.market_id, product?.shop_id, product?.product_id]);

  const addToLocalCart = () => {
    if (!product) return;
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const cart = (() => { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } })();
    
    // Calculate final price with size adjustment
    const finalPrice = selectedSize
      ? Number(product.price) + Number(selectedSize.price_adjustment || 0)
      : Number(product.price);

    // Use size_id if present, else fall back to size_name to distinguish variants
    const sizeKey = selectedSize?.size_id ?? selectedSize?.size_name ?? 'nosize';
    const cartKey = `${product.product_id}_${sizeKey}`;
    const found = cart.find(i => {
      const k = i.size_id ?? i.size_name ?? 'nosize';
      return `${i.product_id}_${k}` === cartKey;
    });

    const newItem = {
      product_id: product.product_id,
      size_id: selectedSize?.size_id ?? null,
      size_name: selectedSize?.size_name ?? null,
      name: product.name,
      price: finalPrice,
      price_adjustment: selectedSize?.price_adjustment ?? 0,
      base_price: product.price,
      unit: product.unit || null,
      image_url: product.image_url,
      shop_id: product.shop_id,
      shop_name: product.shop_name,
      market_name: product.market_name,
      qty,
    };

    const next = found
      ? cart.map(i => {
          const k = i.size_id ?? i.size_name ?? 'nosize';
          return `${i.product_id}_${k}` === cartKey
            ? { ...i, qty: i.qty + qty, price: finalPrice, price_adjustment: newItem.price_adjustment, base_price: newItem.base_price }
            : i;
        })
      : [...cart, newItem];
    localStorage.setItem('cart', JSON.stringify(next));
    window.dispatchEvent(new Event('cart-updated'));
    setAddedMsg('✅ เพิ่มลงตะกร้าแล้ว!');
    setTimeout(() => setAddedMsg(''), 2000);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center', color:'#94a3b8' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
        <p style={{ fontWeight:600 }}>กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
  if (!product) return (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center', color:'#94a3b8' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>😕</div>
        <p style={{ fontWeight:600 }}>ไม่พบข้อมูลสินค้า</p>
        <button onClick={() => navigate(-1)} style={{ marginTop:16, padding:'10px 24px', background:'linear-gradient(135deg,#8d4d11,#6b3a0d)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:600 }}>ย้อนกลับ</button>
      </div>
    </div>
  );

  const images = product.images?.map(u => resolveImg(u, PFALLBACK)) || [resolveImg(product.image_url, PFALLBACK)];
  const sizes  = Array.isArray(product.sizes) ? product.sizes : [];

  const TABS = [
    { key:'description', label:'รายละเอียด' },
    { key:'info',        label:'ข้อมูลเพิ่มเติม' },
  ];

  // Build info table rows — only show rows with actual value
  const infoRows = [
    ['ชื่อสินค้า', product.name],
    product.category   && ['หมวดหมู่',  product.category],
    product.unit       && ['หน่วย',      product.unit],
    ['ราคา',      fmt(product.price)],
    product.shop_name  && ['ร้านค้า',   product.shop_name],
    product.market_name&& ['ตลาดน้ำ',  product.market_name],
  ].filter(Boolean);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:'#f4f2ef', minHeight:'100vh' }}>
      <style>{`
        @keyframes pd-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .pd-card { animation: pd-in 0.4s ease; }
        @media (max-width: 640px) {
          .pd-gallery { flex: none !important; padding: 0 !important; }
          .pd-info { padding: 20px 20px 28px !important; }
          .pd-img-wrap { border-radius: 0 !important; aspect-ratio: unset !important; height: 260px !important; }
          .pd-img-wrap img { height: 260px !important; width: 100% !important; object-fit: cover !important; }
        }
      `}</style>

      {/* Navbar */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)', borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="rsp-header-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', height:68, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <button onClick={() => navigate('/homepage')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height:45, width:'auto', objectFit:'contain' }}/>
          </button>
          <nav className="rsp-desktop-nav" style={{ display:'flex', gap:4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:active?600:400, background:active?'#edf3ff':'transparent', color:active?'#4b8ff4':'#475569', transition:'all 0.15s' }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/cart')} style={{ position:'relative', width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
              <i className="fas fa-basket-shopping" style={{ fontSize:17 }}/>
              {cartCount > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#8d4d11', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{cartCount > 9 ? '9+' : cartCount}</span>}
            </button>
            <button onClick={() => navigate('/profile')} style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
              <i className="fas fa-user-circle" style={{ fontSize:18 }}/>
            </button>
          </div>
        </div>
      </header>

      <main className="rsp-main" style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* Breadcrumb / back */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24, flexWrap:'wrap', minWidth:0 }}>
          <button onClick={() => navigate(-1)}
            style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#fff', border:'1.5px solid #ede9e3', borderRadius:999, padding:'7px 16px', color:'#5c4a38', fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 1px 6px rgba(0,0,0,0.07)', transition:'all 0.15s', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#8d4d11'; e.currentTarget.style.color='#8d4d11'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#ede9e3'; e.currentTarget.style.color='#5c4a38'; }}>
            <FaChevronLeft style={{ fontSize:10 }}/> ย้อนกลับ
          </button>
          <span style={{ color:'#d4c8bb', fontSize:16, flexShrink:0 }}>›</span>
          <span style={{ fontSize:13, color:'#8d4d11', fontWeight:700, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', minWidth:0 }}>{product.name}</span>
        </div>

        {/* ── Product card ─────────────────────────────────────── */}
        <div className="pd-card" style={{ background:'#fff', borderRadius:26, border:'1px solid #ede9e3', boxShadow:'0 12px 48px rgba(141,77,17,0.12)', overflow:'hidden', marginBottom:22 }}>
          {/* Accent bar */}
          <div style={{ height:4, background:'linear-gradient(90deg,#8d4d11 0%,#c7986e 55%,#f5d0a0 100%)' }} />
          <div className="rsp-flex-row rsp-stack" style={{ display:'flex', flexWrap:'wrap' }}>

            {/* Gallery */}
            <div className="pd-gallery" style={{ flex:'0 0 400px', minWidth:280, background:'linear-gradient(160deg,#fff8f0 0%,#faf3e8 55%,#f5eada 100%)', padding:'32px 28px 32px', position:'relative', overflow:'hidden' }}>
              {/* Decorative circles */}
              <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'rgba(141,77,17,0.06)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-40, left:-40, width:150, height:150, borderRadius:'50%', background:'rgba(141,77,17,0.04)', pointerEvents:'none' }} />
              <div style={{ position:'relative', zIndex:1 }}>
                <div className="pd-img-wrap" style={{ width:'100%', aspectRatio:'1', borderRadius:22, overflow:'hidden', boxShadow:'0 16px 48px rgba(141,77,17,0.22)', position:'relative' }}>
                  <img src={images[activeImg]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={e => { e.target.onerror=null; e.target.src=PFALLBACK; }}/>
                </div>
                {images.length > 1 && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16 }}>
                    {images.map((img, idx) => (
                      <img key={idx} src={img} alt={product.name} onClick={() => setActiveImg(idx)}
                        style={{ width:64, height:64, borderRadius:14, objectFit:'cover', cursor:'pointer', border:`2.5px solid ${activeImg===idx?'#8d4d11':'rgba(0,0,0,0.06)'}`, boxShadow: activeImg===idx ? '0 4px 16px rgba(141,77,17,0.32)' : '0 1px 6px rgba(0,0,0,0.1)', transition:'all 0.18s', background:'#fff' }}
                        onError={e => { e.target.onerror=null; e.target.src=PFALLBACK; }}/>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pd-info" style={{ flex:1, minWidth:260, padding:'32px 36px 36px' }}>

              {/* Category badge */}
              {product.category && (
                <div style={{ marginBottom:12 }}>
                  <span style={{ display:'inline-block', padding:'4px 13px', borderRadius:999, background:'#fff8f0', border:'1px solid rgba(141,77,17,0.22)', color:'#8d4d11', fontSize:11, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase' }}>
                    {product.category}
                  </span>
                </div>
              )}

              {/* Name */}
              <h1 style={{ fontSize:'clamp(1.45rem,3vw,2rem)', fontWeight:900, color:'#1a0f08', margin:'0 0 18px', lineHeight:1.25, letterSpacing:'-0.02em' }}>{product.name}</h1>

              {/* Price pill */}
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:8, marginBottom:22, padding:'13px 22px', background:'linear-gradient(135deg,#fff8f0,#fef3e6)', borderRadius:16, border:'1.5px solid rgba(141,77,17,0.14)', boxShadow:'0 2px 10px rgba(141,77,17,0.08)' }}>
                <span style={{ fontSize:36, fontWeight:900, color:'#8d4d11', letterSpacing:'-0.03em', lineHeight:1 }}>
                  {fmt(selectedSize
                    ? Number(product.price) + Number(selectedSize.price_adjustment || 0)
                    : product.price
                  )}
                </span>
                {selectedSize && <span style={{ fontSize:12, color:'#b47a45', fontWeight:600 }}>({selectedSize.size_name})</span>}
                {product.unit && <span style={{ fontSize:15, color:'#b47a45', fontWeight:600 }}>/ {product.unit}</span>}
              </div>

              {/* Description */}
              {product.description && (
                <p style={{ color:'#5c4a38', fontSize:14, lineHeight:1.8, margin:'0 0 20px', padding:'14px 18px', background:'#faf8f5', borderRadius:14, border:'1px solid #f0ebe3' }}>
                  {product.description}
                </p>
              )}

              {/* Sizes */}
              {sizes.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:'#8d4d11', textTransform:'uppercase', letterSpacing:'0.08em' }}>ขนาด</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {sizes.map((s, i) => {
                      const isSelected = selectedSizeIdx === i;
                      const adjustedPrice = Number(product.price) + Number(s.price_adjustment || 0);
                      return (
                        <button key={i} onClick={() => { setSelectedSize(s); setSelectedSizeIdx(i); }}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'10px 16px', borderRadius:14,
                            border: isSelected ? '2px solid #8d4d11' : '1.5px solid #e2e0db',
                            background: isSelected ? '#fff8f0' : '#faf8f5',
                            cursor:'pointer', transition:'all 0.2s', textAlign:'left',
                            boxShadow: isSelected ? '0 4px 14px rgba(141,77,17,0.2)' : 'none',
                          }}
                          onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor='#c7986e'; e.currentTarget.style.background='#fff8f0'; }}}
                          onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor='#e2e0db'; e.currentTarget.style.background='#faf8f5'; }}}
                        >
                          {/* Radio circle */}
                          <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, border:`2px solid ${isSelected ? '#8d4d11' : '#d4c8bb'}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                            {isSelected && <div style={{ width:8, height:8, borderRadius:'50%', background:'#8d4d11' }} />}
                          </div>
                          {/* Label */}
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color: isSelected ? '#8d4d11' : '#1a0f08', lineHeight:1.2 }}>{s.size_name}</div>
                            <div style={{ fontSize:11, color: isSelected ? '#6b3a0d' : '#8d4d11', fontWeight:700, marginTop:2 }}>{fmt(adjustedPrice)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shop / Market badges */}
              {(product.shop_name || product.market_name) && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
                  {product.shop_name && (
                    <button onClick={() => product.shop_id && navigate(`/shop-profile/${product.shop_id}`)}
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:999, background:'#fff8f0', border:'1.5px solid rgba(141,77,17,0.22)', fontSize:13, fontWeight:700, color:'#8d4d11', cursor: product.shop_id ? 'pointer' : 'default', transition:'all 0.15s' }}
                      onMouseEnter={e => { if (product.shop_id) { e.currentTarget.style.background='#fef0e0'; e.currentTarget.style.borderColor='#8d4d11'; }}}
                      onMouseLeave={e => { e.currentTarget.style.background='#fff8f0'; e.currentTarget.style.borderColor='rgba(141,77,17,0.22)'; }}>
                      🏪 {product.shop_name}{product.shop_id ? ' →' : ''}
                    </button>
                  )}
                  {product.market_name && (
                    <span style={{ padding:'6px 14px', borderRadius:999, background:'#f4f2ef', border:'1.5px solid #d4c8b8', fontSize:13, fontWeight:600, color:'#7a6550' }}>
                      📍 {product.market_name}
                    </span>
                  )}
                </div>
              )}

              {/* Qty + Add to cart */}
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#faf8f5', borderRadius:14, padding:'7px 14px', border:'1.5px solid #ede9e3' }}>
                  <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ width:32, height:32, borderRadius:9, border:'1.5px solid #d4c8bb', background:'#fff', cursor:'pointer', fontWeight:800, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:'#7a6550', transition:'all 0.15s' }}>−</button>
                  <span style={{ minWidth:36, textAlign:'center', fontSize:17, fontWeight:900, color:'#1a0f08' }}>{qty}</span>
                  <button onClick={() => setQty(q => q+1)} style={{ width:32, height:32, borderRadius:9, border:'1.5px solid #c7986e', background:'#fff8f0', cursor:'pointer', fontWeight:800, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:'#8d4d11', transition:'all 0.15s' }}>+</button>
                </div>
                <button onClick={addToLocalCart}
                  style={{ flex:1, minWidth:160, padding:'14px 24px', background: addedMsg ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:15, cursor:'pointer', boxShadow: addedMsg ? '0 6px 20px rgba(34,197,94,0.38)' : '0 8px 26px rgba(141,77,17,0.38)', transition:'all 0.3s' }}
                  onMouseEnter={e => { if (!addedMsg) e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='none'; }}>
                  {addedMsg || '🛒 เพิ่มลงตะกร้า'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="pd-card" style={{ background:'#fff', borderRadius:22, border:'1px solid #ede9e3', boxShadow:'0 4px 24px rgba(0,0,0,0.07)', overflow:'hidden', animationDelay:'0.1s' }}>
          <div style={{ display:'flex', borderBottom:'2px solid #f0ebe3', background:'#faf8f5' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'16px 12px', background:'none', border:'none', fontWeight:tab===t.key?700:500, fontSize:14, color:tab===t.key?'#8d4d11':'#64748b', cursor:'pointer', borderBottom:tab===t.key?'3px solid #8d4d11':'3px solid transparent', transition:'all 0.15s', marginBottom:-2 }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:28 }}>
            {tab === 'description' && (
              product.description ? (
                <p style={{ color:'#5c4a38', fontSize:14, lineHeight:1.9, margin:0 }}>{product.description}</p>
              ) : (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#b0a090' }}>
                  <p style={{ fontSize:28, margin:'0 0 8px' }}>📝</p>
                  <p style={{ fontWeight:600, margin:0 }}>ยังไม่มีรายละเอียดสินค้า</p>
                </div>
              )
            )}
            {tab === 'info' && (
              <div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                  <thead>
                    <tr style={{ background:'#faf8f5' }}>
                      <th style={{ textAlign:'left', padding:'12px 16px', fontWeight:700, color:'#7a6550', borderBottom:'1px solid #f0ebe3', width:'35%' }}>คุณสมบัติ</th>
                      <th style={{ textAlign:'left', padding:'12px 16px', fontWeight:700, color:'#7a6550', borderBottom:'1px solid #f0ebe3' }}>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {infoRows.map(([k, v]) => (
                      <tr key={k} style={{ borderBottom:'1px solid #faf8f5' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#faf8f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'12px 16px', color:'#b0a090', fontWeight:600 }}>{k}</td>
                        <td style={{ padding:'12px 16px', color:'#1a0f08', fontWeight:500 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sizes.length > 0 && (
                  <div style={{ marginTop:20, padding:'16px', background:'#faf8f5', borderRadius:14, border:'1px solid #f0ebe3' }}>
                    <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'#8d4d11' }}>ขนาดที่มีให้เลือก</p>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      {sizes.map((s, i) => (
                        <div key={i} style={{ padding:'8px 16px', borderRadius:12, border:'1.5px solid #e2e0db', background:'#fff', textAlign:'center' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#1a0f08' }}>{s.size_name}</div>
                          <div style={{ fontSize:12, color:'#8d4d11', fontWeight:700, marginTop:2 }}>
                            {Number(s.price_adjustment) === 0
                              ? fmt(product.price)
                              : `${fmt(Number(product.price) + Number(s.price_adjustment))} (${Number(s.price_adjustment) > 0 ? '+' : ''}${fmt(s.price_adjustment)})`
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Related products from same market */}
      {related.length > 0 && (
        <main className="rsp-main" style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 48px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <h2 style={{ margin:'0 0 3px', fontWeight:900, fontSize:19, color:'#1a0f08', letterSpacing:'-0.01em' }}>🛍️ สินค้าในตลาดน้ำเดียวกัน</h2>
              {product?.market_name && <p style={{ margin:0, fontSize:13, color:'#b0a090', fontWeight:500 }}>📍 {product.market_name}</p>}
            </div>
          </div>
          <div className="rsp-grid-auto" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:16 }}>
            {related.map(p => (
              <RelatedCard key={p.product_id} product={p}
                onNavigate={() => navigate(`/product/${p.product_id}`)} />
            ))}
          </div>
        </main>
      )}

      <FloatingCart />

      <Footer/>
    </div>
  );
}

function RelatedCard({ product: p, onNavigate }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onNavigate}
      style={{ background:'#fff', borderRadius:20, overflow:'hidden', cursor:'pointer',
        boxShadow: hov ? '0 20px 48px rgba(0,0,0,0.13)' : '0 2px 12px rgba(0,0,0,0.07)',
        transform: hov ? 'translateY(-6px)' : 'none',
        transition:'all 0.28s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column',
        border:'1px solid #ede9e3',
      }}>
      <div className="product-img" style={{ background:'#f5eada', position:'relative', overflow:'hidden', flexShrink:0 }}>
        <img src={resolveImg(p.image_url, PFALLBACK)} alt={p.name}
          onError={e => { e.target.onerror=null; e.target.src=PFALLBACK; }}
          style={{ width:'100%', height:'100%', objectFit:'cover',
            transition:'transform 0.5s ease',
            transform: hov ? 'scale(1.06)' : 'scale(1.0)' }} />
      </div>
      <div style={{ padding:'12px 14px 14px', flex:1, display:'flex', flexDirection:'column', gap:6 }}>
        <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#0f172a',
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', lineHeight:1.4 }}>
          {p.name}
        </p>
        {p.shop_name && (
          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>🏪 {p.shop_name}</span>
        )}
        <div style={{ marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:800, fontSize:15, color:'#8d4d11' }}>฿{Number(p.price||0).toLocaleString()}</span>
          {p.unit && <span style={{ fontSize:12, color:'#94a3b8' }}>/ {p.unit}</span>}
        </div>
      </div>
    </div>
  );
}
