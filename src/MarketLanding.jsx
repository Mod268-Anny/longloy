// ============================================================
// MarketLanding.jsx — หน้า Landing ของตลาดน้ำ (แบบมีตะกร้า)
//
// หน้าที่: แสดงตลาดน้ำ + ร้านค้า + สินค้า พร้อมเพิ่มลงตะกร้าได้เลย
//
// ส่วนที่มี:
//   - Hero / Banner ตลาดน้ำ
//   - ร้านค้าในตลาด + สินค้า (grid)
//   - Cart sidebar + FloatingCart
//   - ค้นหาสินค้าและร้านค้า
//
// เส้นทาง: /market-landing (ถ้ามีใช้งาน) หรือเรียกจาก Market.jsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBasketShopping, FaXmark, FaTrashCan, FaCartPlus, FaLocationDot, FaMagnifyingGlass, FaChevronRight, FaStar, FaWater } from "react-icons/fa6";
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from "react-icons/md";
import Footer from "./Footer";
import FloatingCart from './FloatingCart';
import API_URL, { secureLocalFetch } from "./config";

const NAV = [
  { label:"หน้าแรก",   icon:<MdHome size={18}/>,                path:"/homepage" },
  { label:"ตลาดน้ำ",   icon:<MdStorefront size={18}/>,           path:"/market"   },
  { label:"เกม",       icon:<MdOutlineSportsEsports size={18}/>, path:"/game"     },
  { label:"ช่วยเหลือ", icon:<MdHelpOutline size={18}/>,          path:"/help"     },
];

const imgSrc = (url, fallback="https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=800&q=80") =>
  url?.startsWith("http")||url?.startsWith("/") ? url : url ? `/images/${url}` : fallback;

export default function MarketLanding() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [markets,         setMarkets]         = useState([]);
  const [products,        setProducts]        = useState([]);
  const [loadingMarkets,  setLoadingMarkets]  = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeFilter,    setActiveFilter]    = useState("ทั้งหมด");
  const [cartOpen,        setCartOpen]        = useState(false);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [cart,            setCart]            = useState([]);
  const [marketRatings,   setMarketRatings]   = useState({});

  useEffect(() => {
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(r => r.json())
      .then(async d => {
        const arr = Array.isArray(d) ? d : [];
        setMarkets(arr);
        const ratingsObj = {};
        await Promise.all(arr.map(async m => {
          if (!m.market_id) return;
          try {
            const r = await secureLocalFetch(`${API_URL}/market-reviews/${m.market_id}`);
            const reviews = r.ok ? await r.json() : [];
            const valid = Array.isArray(reviews) ? reviews.map(rv => Number(rv.rating) || 0).filter(v => v > 0) : [];
            ratingsObj[m.market_id] = {
              avg:   valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)) : 0,
              count: valid.length,
            };
          } catch { ratingsObj[m.market_id] = { avg: 0, count: 0 }; }
        }));
        setMarketRatings(ratingsObj);
      })
      .catch(() => {})
      .finally(() => setLoadingMarkets(false));
  }, []);

  useEffect(() => {
    if (!markets.length) return;
    setLoadingProducts(true);
    const fetchForMarket = async (market) => {
      try {
        const shops = await secureLocalFetch(`${API_URL}/shops/by-market/${market.market_id}`).then(r=>r.json());
        if (!Array.isArray(shops)||!shops.length) return [];
        const all = await Promise.all(shops.slice(0,4).map(shop=>
          secureLocalFetch(`${API_URL}/products/by-shop/${shop.shop_id}`).then(r=>r.json())
            .then(prods=>Array.isArray(prods)?prods.map(p=>({...p,market_name:market.name,market_id:market.market_id})):[])
            .catch(()=>[])
        ));
        return all.flat();
      } catch { return []; }
    };
    Promise.all(markets.map(fetchForMarket)).then(r=>setProducts(r.flat())).finally(()=>setLoadingProducts(false));
  }, [markets]);

  const addToCart = useCallback((product) => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    setCart(prev => {
      const existingShopId = prev.length > 0 ? prev[0].shop_id : null;
      if (existingShopId && String(existingShopId) !== String(product.shop_id)) {
        const existingName = prev[0].shop_name || `ร้าน #${existingShopId}`;
        const ok = window.confirm(`ตะกร้ามีสินค้าจาก "${existingName}" อยู่แล้ว\nต้องการล้างตะกร้าและเพิ่มสินค้าจากร้านใหม่แทนหรือไม่?`);
        if (!ok) return prev;
        const next = [{...product, qty:1}];
        localStorage.setItem('cart', JSON.stringify(next));
        window.dispatchEvent(new Event('cart-updated'));
        return next;
      }
      const found = prev.find(i=>i.product_id===product.product_id);
      const next = found
        ? prev.map(i=>i.product_id===product.product_id?{...i,qty:i.qty+1}:i)
        : [...prev,{...product,qty:1}];
      localStorage.setItem('cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
      return next;
    });
    setCartOpen(true);
  }, [navigate]);

  const removeFromCart = useCallback((pid)=>setCart(prev=>prev.filter(i=>i.product_id!==pid)),[]);
  const updateQty = useCallback((pid,delta)=>setCart(prev=>prev.map(i=>i.product_id===pid?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0)),[]);

  const totalItems = cart.reduce((s,i)=>s+i.qty,0);
  const totalPrice = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const filterOptions = ["ทั้งหมด",...markets.map(m=>m.name)];
  const visibleProducts = products
    .filter(p=>activeFilter==="ทั้งหมด"||p.market_name===activeFilter)
    .filter(p=>!searchTerm||p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0,12);

  const handleCheckout = () => { if (!cart.length) return; navigate("/cart"); };

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh", color:"#0f172a" }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:68, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <button onClick={()=>navigate("/homepage")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height:45, width:"auto", objectFit:"contain" }} />
          </button>
          <nav className="rsp-desktop-nav" style={{ display:"flex", gap:4 }}>
            {NAV.map(n=>{
              const active = location.pathname===n.path;
              return (
                <button key={n.label} onClick={()=>navigate(n.path)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:active?600:400, background:active?"#edf3ff":"transparent", color:active?"#4b8ff4":"#475569", transition:"all 0.15s" }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={()=>setCartOpen(v=>!v)} style={{ width:40, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <FaBasketShopping style={{ fontSize:17 }} />
              {totalItems>0 && <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:"#ef4444", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{totalItems}</span>}
            </button>
            <button onClick={()=>navigate("/profile")} style={{ width:40, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className="fas fa-user-circle" style={{ fontSize:18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ position:"relative", background:"#4b8ff4", color:"#fff", padding:"96px 24px 80px", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,0.08)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:-40, width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"relative", maxWidth:896, margin:"0 auto", textAlign:"center", zIndex:1 }}>
          <span style={{ display:"inline-block", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:13, fontWeight:600, padding:"6px 18px", borderRadius:999, border:"1px solid rgba(255,255,255,0.3)", marginBottom:24 }}>
            สัมผัสวิถีชีวิตริมคลองเมืองกรุง
          </span>
          <h1 style={{ fontSize:"clamp(2.2rem,5vw,3.5rem)", fontWeight:800, lineHeight:1.15, margin:"0 0 20px", letterSpacing:"-0.02em" }}>
            สำรวจตลาดน้ำ<br style={{ display:"block" }} /> กรุงเทพมหานคร
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.65)", margin:"0 0 32px", maxWidth:560, marginLeft:"auto", marginRight:"auto", lineHeight:1.7 }}>
            ช้อปปิ้งวิถีไทย กินอาหารอร่อย และอุดหนุนสินค้าของฝากจากชุมชนริมคลองแท้ๆ
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
            <button onClick={()=>document.getElementById("markets-section")?.scrollIntoView({behavior:"smooth"})}
              style={{ background:"#fff", color:"#4b8ff4", border:"none", borderRadius:12, padding:"14px 32px", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 20px rgba(0,0,0,0.15)", transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#f0f4ff"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#fff"; e.currentTarget.style.transform="none"; }}>
              สำรวจตลาดน้ำเลย
            </button>
            <button onClick={()=>document.getElementById("shop-section")?.scrollIntoView({behavior:"smooth"})}
              style={{ background:"rgba(255,255,255,0.15)", color:"#fff", border:"1.5px solid rgba(255,255,255,0.5)", borderRadius:12, padding:"14px 32px", fontSize:15, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.25)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.15)"; e.currentTarget.style.transform="none"; }}>
              ช้อปสินค้าออนไลน์
            </button>
          </div>
        </div>
      </section>

      {/* ── Markets Section ─────────────────────────────────────────── */}
      <section id="markets-section" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <p style={{ color:"#4b8ff4", fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", margin:"0 0 8px" }}>ตลาดน้ำในกรุงเทพฯ</p>
          <h2 style={{ fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, color:"#0f172a", margin:"0 0 8px" }}>ตลาดน้ำยอดนิยม</h2>
          <p style={{ color:"#64748b", margin:0 }}>สัมผัสตลาดน้ำบรรยากาศดี เกิดขึ้นจากฝีมือชุมชน</p>
        </div>
        {loadingMarkets ? <MarketSkeleton/> : markets.length===0 ? <EmptyState text="ยังไม่มีข้อมูลตลาดน้ำ"/> : (
          <div className="rsp-grid-auto" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:28 }}>
            {markets.slice(0,6).map((m,i)=>(
              <MarketCard key={m.market_id} market={m} idx={i} ratingObj={marketRatings[m.market_id] || { avg: 0, count: 0 }} onClick={()=>navigate(`/market-review/${m.market_id}`)} />
            ))}
          </div>
        )}
        {markets.length>6 && (
          <div style={{ textAlign:"center", marginTop:40 }}>
            <button onClick={()=>navigate("/market")} style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#4b8ff4", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:14 }}>
              ดูตลาดน้ำทั้งหมด <FaChevronRight style={{ fontSize:12 }}/>
            </button>
          </div>
        )}
      </section>

      {/* ── Shop Section ────────────────────────────────────────────── */}
      <section id="shop-section" style={{ background:"#f0f4f8", padding:"80px 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-end", justifyContent:"space-between", gap:24, marginBottom:36 }}>
            <div>
              <p style={{ color:"#8d4d11", fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", margin:"0 0 6px" }}>สินค้าชุมชน</p>
              <h2 style={{ fontSize:"clamp(1.4rem,3vw,1.8rem)", fontWeight:800, color:"#0f172a", margin:"0 0 4px" }}>ช้อปสินค้าจากตลาดน้ำ</h2>
              <p style={{ color:"#64748b", margin:0, fontSize:14 }}>สั่งซื้ออาหารและสินค้า OTOP ส่งตรงถึงบ้านคุณ</p>
            </div>
            <div style={{ position:"relative", width:280 }}>
              <FaMagnifyingGlass style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", fontSize:13, pointerEvents:"none" }}/>
              <input type="text" placeholder="ค้นหาสินค้า..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px 10px 40px", borderRadius:999, border:"1px solid #e2e8f0", background:"#fff", fontSize:14, outline:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}
              />
            </div>
          </div>
          {/* Filter pills */}
          <div style={{ display:"flex", gap:8, marginBottom:28, overflowX:"auto", paddingBottom:4 }}>
            {filterOptions.map(f=>(
              <button key={f} onClick={()=>setActiveFilter(f)} style={{ whiteSpace:"nowrap", fontSize:13, fontWeight:600, padding:"8px 18px", borderRadius:999, border:"none", cursor:"pointer", transition:"all 0.15s", background:activeFilter===f?"#4b8ff4":"#fff", color:activeFilter===f?"#fff":"#475569", boxShadow:activeFilter===f?"0 3px 10px rgba(75,143,244,0.3)":"0 1px 3px rgba(0,0,0,0.06)" }}>
                {f}
              </button>
            ))}
          </div>
          {loadingProducts ? <ProductSkeleton/> : visibleProducts.length===0 ? <EmptyState text="ไม่พบสินค้า"/> : (
            <div className="rsp-grid-auto" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
              {visibleProducts.map(p=>(
                <ProductCard key={p.product_id} product={p} onAdd={()=>addToCart(p)} onView={()=>navigate(`/product/${p.product_id}`)}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Cart overlay + sidebar ─────────────────────────────────── */}
      {cartOpen && <div onClick={()=>setCartOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }}/>}
      <aside style={{ position:"fixed", inset:"0 0 0 auto", width:380, background:"#fff", boxShadow:"-4px 0 24px rgba(0,0,0,0.12)", zIndex:50, display:"flex", flexDirection:"column", transform:cartOpen?"translateX(0)":"translateX(100%)", transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #e2e8f0", background:"#0f172a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ fontWeight:800, fontSize:16, display:"flex", alignItems:"center", gap:8, margin:0 }}><FaBasketShopping/> ตะกร้าสินค้า</h3>
          <button onClick={()=>setCartOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:18 }}><FaXmark/></button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          {cart.length===0 ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#94a3b8", gap:12, padding:"48px 0" }}>
              <FaBasketShopping style={{ fontSize:48, opacity:0.25 }}/>
              <p style={{ fontSize:14, margin:0 }}>ไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : cart.map(item=>(
            <CartItem key={item.product_id} item={item} onRemove={()=>removeFromCart(item.product_id)} onInc={()=>updateQty(item.product_id,1)} onDec={()=>updateQty(item.product_id,-1)}/>
          ))}
        </div>
        <div style={{ padding:20, borderTop:"1px solid #f1f5f9", background:"#f8fafc" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, fontWeight:700, fontSize:16 }}>
            <span style={{ color:"#475569" }}>ยอดรวมทั้งหมด:</span>
            <span style={{ color:"#4b8ff4", fontSize:20 }}>฿{totalPrice.toLocaleString()}</span>
          </div>
          <button onClick={handleCheckout} disabled={!cart.length} style={{ width:"100%", background:"#4b8ff4", color:"#fff", border:"none", borderRadius:12, padding:"14px", fontWeight:700, fontSize:15, cursor:cart.length?"pointer":"not-allowed", opacity:cart.length?1:0.5, boxShadow:"0 4px 14px rgba(75,143,244,0.35)", marginBottom:8 }}>
            ดำเนินการสั่งซื้อสินค้า
          </button>
          <button onClick={()=>setCartOpen(false)} style={{ width:"100%", background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", padding:"8px" }}>ช้อปต่อ</button>
        </div>
      </aside>

      <FloatingCart />

      <Footer/>
    </div>
  );
}

/* ── MarketCard ─────────────────────────────────────────────────── */
const BADGE_DAYS = ["เสาร์-อาทิตย์","เสาร์-อาทิตย์","เสาร์-อาทิตย์","ทุกวัน","ทุกวัน","ทุกวัน"];
function MarketCard({ market, idx, ratingObj = { avg: 0, count: 0 }, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:hov?"0 20px 48px rgba(0,0,0,0.13)":"0 2px 12px rgba(0,0,0,0.07)", transition:"all 0.28s cubic-bezier(0.4,0,0.2,1)", cursor:"pointer", transform:hov?"translateY(-6px)":"none", border:"1px solid rgba(226,232,240,0.6)" }}>
      <div className="market-img" style={{ position:"relative", background:"#0f172a" }}>
        <img src={imgSrc(market.image_url)} alt={market.name} onError={e=>{e.target.onerror=null;e.target.src="https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&q=80";}}
          style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s", transform:hov?"scale(1.47)":"scale(1.40)" }}/>
        <span style={{ position:"absolute", top:14, left:14, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(4px)", fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:999, color:"#334155", boxShadow:"0 2px 6px rgba(0,0,0,0.1)" }}>
          {BADGE_DAYS[idx]??"เสาร์-อาทิตย์"}
        </span>
        {ratingObj.avg > 0 && (
          <div style={{ position:"absolute", top:14, right:14, background:"rgba(141,77,17,0.92)", backdropFilter:"blur(6px)", borderRadius:999, padding:"4px 10px", display:"flex", alignItems:"center", gap:4 }}>
            <FaStar style={{ color:"#fff", fontSize:10 }}/>
            <span style={{ color:"#fff", fontSize:11, fontWeight:800 }}>{ratingObj.avg.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div style={{ padding:"18px 20px" }}>
        <h3 style={{ fontSize:15, fontWeight:800, color:"#0f172a", margin:"0 0 6px", transition:"color 0.15s", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", ...(hov?{color:"#4b8ff4"}:{}) }}>{market.name}</h3>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
          {[1,2,3,4,5].map(i => (
            <FaStar key={i} style={{ fontSize:13, color: i <= Math.round(ratingObj.avg) ? "#8d4d11" : "#e2e8f0" }}/>
          ))}
          {ratingObj.avg > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color:"#8d4d11" }}>{ratingObj.avg.toFixed(1)}</span>
          )}
          <span style={{ fontSize:12, color:"#94a3b8" }}>
            {ratingObj.count > 0 ? `(${ratingObj.count})` : "ยังไม่มีรีวิว"}
          </span>
        </div>
        <p style={{ color:"#64748b", fontSize:13, lineHeight:1.65, margin:"0 0 12px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {market.description||"ตลาดน้ำบรรยากาศดีริมคลอง"}
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#94a3b8" }}>
          <FaLocationDot style={{ color:"#4b8ff4", fontSize:13 }}/>
          <span>{market.location||"กรุงเทพมหานคร"}</span>
        </div>
      </div>
    </div>
  );
}

/* ── ProductCard ─────────────────────────────────────────────────── */
function ProductCard({ product, onAdd, onView }) {
  const [hov, setHov] = useState(false);
  const badge = product.market_name || product.shop_name || "สินค้า";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: "1px solid rgba(226,232,240,0.6)",
      }}>
      <div onClick={onView} className="product-img" style={{ cursor: "pointer", flexShrink: 0, background: "#f1f5f9", position: "relative", width: '100%', height: 220, overflow: 'hidden' }}>
        <img src={imgSrc(product.image_url, "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80")} alt={product.name}
          onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80"; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }} />
        <span style={{
          position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(4px)", padding: "4px 12px", borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: "#334155",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
          {badge}
        </span>
        <button onClick={e => { e.stopPropagation(); onAdd(); }} aria-label="เพิ่มลงตะกร้า" style={{
          position: "absolute", bottom: 14, right: 14, width: 40, height: 40, borderRadius: "50%",
          border: "none", cursor: "pointer", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hov ? "0 8px 20px rgba(141,77,17,0.28)" : "0 2px 8px rgba(141,77,17,0.2)",
        }}>
          <FaCartPlus style={{ fontSize: 14 }} />
        </button>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <p onClick={onView} style={{
          fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 4px",
          cursor: "pointer", overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 1, WebkitBoxOrient: "vertical", transition: "color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#6b3a0d"}
          onMouseLeave={e => e.currentTarget.style.color = "#0f172a"}
        >
          {product.name || "สินค้า"}
        </p>
        <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5, flex: 1, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.description || "สินค้าคุณภาพดีจากชุมชน"}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#0f172a" }}>
            ฿{Number(product.price ?? 0).toLocaleString()}
          </p>
          <div style={{ minWidth: 34, minHeight: 34 }} />
        </div>
      </div>
    </div>
  );
}

/* ── CartItem ────────────────────────────────────────────────────── */
function CartItem({ item, onRemove, onInc, onDec }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, background:"#f8fafc", padding:12, borderRadius:12, border:"1px solid #f1f5f9" }}>
      <img src={imgSrc(item.image_url,"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=100&q=80")} alt={item.name}
        onError={e=>{e.target.onerror=null;e.target.src="https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=100&q=80";}}
        style={{ width:56, height:56, borderRadius:10, objectFit:"cover", flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:600, color:"#0f172a", fontSize:13, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
        <p style={{ color:"#64748b", fontSize:12, margin:"0 0 8px" }}>฿{Number(item.price??0).toLocaleString()} / ชิ้น</p>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={onDec} style={{ width:24, height:24, borderRadius:"50%", background:"#e2e8f0", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", color:"#475569" }}>−</button>
          <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:"center" }}>{item.qty}</span>
          <button onClick={onInc} style={{ width:24, height:24, borderRadius:"50%", background:"rgba(75,143,244,0.15)", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", color:"#4b8ff4" }}>+</button>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>฿{(Number(item.price??0)*item.qty).toLocaleString()}</span>
        <button onClick={onRemove} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", padding:4, fontSize:13 }}><FaTrashCan/></button>
      </div>
    </div>
  );
}

/* ── Skeletons + Empty ───────────────────────────────────────────── */
function MarketSkeleton() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:28 }}>
      {[1,2,3].map(i=>(
        <div key={i} style={{ background:"#fff", borderRadius:22, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ height:220, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
          <div style={{ padding:20, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ height:18, background:"#f1f5f9", borderRadius:6, width:"70%" }}/>
            <div style={{ height:14, background:"#f1f5f9", borderRadius:6 }}/>
            <div style={{ height:14, background:"#f1f5f9", borderRadius:6, width:"55%" }}/>
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
function ProductSkeleton() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
      {[1,2,3,4,5,6,7,8].map(i=>(
        <div key={i} style={{ background:"#fff", borderRadius:16, overflow:"hidden" }}>
          <div style={{ height:176, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ height:14, background:"#f1f5f9", borderRadius:6, width:"75%" }}/>
            <div style={{ height:12, background:"#f1f5f9", borderRadius:6 }}/>
          </div>
        </div>
      ))}
    </div>
  );
}
function EmptyState({ text }) {
  return (
    <div style={{ textAlign:"center", padding:"80px 0", color:"#94a3b8" }}>
      <p style={{ fontSize:40, margin:"0 0 12px", display:'flex', justifyContent:'center' }}><FaWater /></p>
      <p style={{ fontWeight:600, margin:0 }}>{text}</p>
    </div>
  );
}
