// ============================================================
// Help.jsx — หน้าช่วยเหลือ (FAQ / Getting Started)
//
// หน้าที่: แสดงข้อมูลวิธีใช้งานแอปและคำถามที่พบบ่อย
//
// ส่วนที่มี:
//   - Getting Started: วิธีเริ่มใช้งาน, ค้นหาตลาด, สั่งซื้อ
//   - FAQ แบบ accordion (กดเปิด/ปิดแต่ละข้อ)
//   - ข้อมูลติดต่อ / Social media
// ============================================================
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useCartCount from './useCartCount';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from "react-icons/md";
import Footer from "./Footer";
import FloatingCart from './FloatingCart';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const SERVICES = [
  {
    id: 1, emoji: "🚀",
    title: "Getting Started",
    description: "ส่วนแนะนำการใช้งานเบื้องต้นของแพลตฟอร์ม เพื่อช่วยให้ผู้ใช้งานใหม่สามารถเรียนรู้วิธีค้นหาสถานที่ ร้านค้า กิจกรรม และการใช้งานฟังก์ชันต่าง ๆ ได้อย่างรวดเร็ว",
    image: "https://images.unsplash.com/photo-1521321205814-9d673c65c167?q=80&w=800&auto=format&fit=crop",
    details: {
      tagline: "Start Your Journey in Just a Few Steps.",
      longDesc: "แพลตฟอร์มนี้ถูกพัฒนาขึ้นเพื่อเป็นศูนย์กลางข้อมูลและบริการด้านการท่องเที่ยวเชิงวัฒนธรรม ช่วยให้นักท่องเที่ยวสามารถเข้าถึงข้อมูลร้านค้า สถานที่ท่องเที่ยว รีวิว และกิจกรรมต่าง ๆ ภายในชุมชนตลาดน้ำได้อย่างสะดวก",
      highlights: [
        { q: "1. เริ่มต้นใช้งานแพลตฟอร์ม", a: "แพลตฟอร์มช่วยให้นักท่องเที่ยวเข้าถึงข้อมูลร้านค้า สถานที่ รีวิว และกิจกรรมชุมชนตลาดน้ำได้อย่างสะดวก" },
        { q: "2. วิธีค้นหาสถานที่และร้านค้า", a: "ค้นหาร้านอาหาร คาเฟ่ สถานที่ต่าง ๆ ผ่านระบบค้นหาและตัวกรองหมวดหมู่ เช่น ระยะทาง ประเภทสินค้า หรือคะแนนรีวิว" },
        { q: "3. ดูรายละเอียดร้านค้า", a: "ดูข้อมูลเวลาเปิด–ปิด คะแนนรีวิว แผนที่นำทาง รูปภาพ และข้อมูลสินค้าได้ในหน้าเดียว" },
        { q: "4. ระบบรีวิวและประสบการณ์", a: "แบ่งปันประสบการณ์ รีวิว และรูปภาพจากการท่องเที่ยวจริง เพื่อช่วยสร้างความน่าเชื่อถือ" },
        { q: "5. ระบบสะสมแต้มและกิจกรรม", a: "เข้าร่วมกิจกรรมหรือภารกิจต่าง ๆ เพื่อสะสมคะแนนและรับสิทธิพิเศษ" },
      ],
    },
  },
  {
    id: 2, emoji: "❓",
    title: "FAQs",
    description: "คำถามที่พบบ่อย เป็นส่วนที่รวบรวมคำถามและคำตอบเกี่ยวกับการใช้งานระบบ เพื่อช่วยแก้ไขข้อสงสัยของผู้ใช้งานได้อย่างรวดเร็ว",
    image: "https://images.unsplash.com/photo-1535378620166-273708d44e4c?q=80&w=800&auto=format&fit=crop",
    details: {
      tagline: "Answers That Make Every Experience Easier.",
      longDesc: "ศูนย์รวมคำถามที่พบบ่อย ซึ่งจัดทำขึ้นเพื่อช่วยตอบข้อสงสัยเบื้องต้นของผู้ใช้งาน เช่น การสมัครสมาชิก การค้นหาสถานที่ การรีวิวร้านค้า หรือปัญหาการใช้งานทั่วไป",
      highlights: [
        { q: "ต้องสมัครสมาชิกก่อนใช้งานหรือไม่?", a: "สามารถเข้าชมข้อมูลทั่วไปได้โดยไม่ต้องสมัคร แต่บางฟังก์ชัน เช่น รีวิว การสะสมคะแนน จำเป็นต้องเข้าสู่ระบบก่อน" },
        { q: "สามารถค้นหาสถานที่ใกล้ตัวได้หรือไม่?", a: "ได้ ระบบสามารถแสดงสถานที่ตามตำแหน่งปัจจุบัน พร้อมแนะนำเส้นทางและข้อมูลประกอบ" },
        { q: "ข้อมูลร้านค้าอัปเดตตลอดหรือไม่?", a: "ร้านค้าสามารถอัปเดตข้อมูลแบบเรียลไทม์ เพื่อลดปัญหาข้อมูลคลาดเคลื่อน" },
        { q: "สามารถรีวิวร้านค้าได้หรือไม่?", a: "ได้ ผู้ใช้งานสามารถเขียนรีวิว แนบรูปภาพ และให้คะแนนสถานที่ที่เคยใช้บริการ" },
        { q: "แพลตฟอร์มรองรับมือถือหรือไม่?", a: "รองรับ ออกแบบให้ใช้งานผ่านสมาร์ตโฟนและอุปกรณ์พกพาได้ทุกที่ทุกเวลา" },
      ],
    },
  },
  {
    id: 3, emoji: "🔒",
    title: "Privacy & Security",
    description: "อธิบายนโยบายความเป็นส่วนตัวและมาตรการรักษาความปลอดภัยของระบบ การปกป้องข้อมูลส่วนบุคคล และการรักษาความปลอดภัยของข้อมูล",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
    details: {
      tagline: "Secure Your Data, Protect Your Journey.",
      longDesc: "แพลตฟอร์มให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน โดยข้อมูลส่วนบุคคลจะถูกจัดเก็บและใช้งานเฉพาะเท่าที่จำเป็นต่อการให้บริการ",
      highlights: [
        { q: "นโยบายความเป็นส่วนตัว", a: "ข้อมูลส่วนบุคคลจะถูกจัดเก็บและใช้งานเฉพาะเท่าที่จำเป็น เช่น การเข้าสู่ระบบ การบันทึกโปรด และการปรับปรุงประสบการณ์" },
        { q: "การรักษาความปลอดภัย", a: "ข้อมูลของผู้ใช้งานได้รับการป้องกันด้วยระบบรักษาความปลอดภัย เพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต" },
        { q: "การใช้งานข้อมูลตำแหน่ง", a: "ใช้ข้อมูลตำแหน่งเพื่อช่วยแนะนำสถานที่ใกล้เคียง การนำทาง และการวางแผนเส้นทางเท่านั้น" },
        { q: "การจัดการข้อมูลรีวิว", a: "รีวิวและเนื้อหาที่ผู้ใช้งานโพสต์จะต้องเป็นข้อมูลที่เหมาะสม ระบบขอสงวนสิทธิ์ตรวจสอบเนื้อหาที่ไม่เหมาะสม" },
      ],
    },
  },
];

/* ─── Shared Navbar ──────────────────────────────────────────────── */
function Navbar({ navigate, location }) {
  const cartCount = useCartCount();
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
        </button>
        <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
          {NAV.map(n => { const active = location.pathname === n.path; return <button key={n.label} onClick={() => navigate(n.path)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "#edf3ff" : "transparent", color: active ? "#4b8ff4" : "#475569" }}>{n.icon} <span className="rsp-nav-label">{n.label}</span></button>; })}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/cart")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}><i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />{cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}</button>
          <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fas fa-user-circle" style={{ fontSize: 18 }} /></button>
        </div>
      </div>
    </header>
  );
}


/* ─── Detail page ────────────────────────────────────────────────── */
function DetailPage({ service, onBack, navigate, location }) {
  const { details } = service;
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <Navbar navigate={navigate} location={location} />

      {/* Hero */}
      <div style={{ height: 280, overflow: "hidden", position: "relative" }}>
        <img src={service.image} alt={service.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.7) 100%)" }} />
        <div style={{ position: "absolute", bottom: 24, left: 32, right: 32 }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px" }}>Help Center</p>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(1.5rem,4vw,2.4rem)", margin: "0 0 6px" }}>{service.emoji} {service.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: 0, fontStyle: "italic" }}>{details.tagline}</p>
        </div>
      </div>

      <main className="rsp-main" style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 32 }}>
          <FaChevronLeft style={{ fontSize: 11 }} /> กลับ Help Center
        </button>

        {/* Long description */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", margin: "0 0 12px" }}>รายละเอียด</h2>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.85, margin: 0 }}>{details.longDesc}</p>
        </div>

        {/* Accordion highlights */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "18px 24px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", margin: 0 }}>ข้อมูลเพิ่มเติม</h2>
          </div>
          {details.highlights.map((h, i) => (
            <div key={i} style={{ borderBottom: i < details.highlights.length - 1 ? "1px solid #f8fafc" : "none" }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ width: "100%", padding: "15px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{h.q}</span>
                <FaChevronRight style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, transform: openIdx === i ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {openIdx === i && (
                <div style={{ padding: "0 24px 16px", fontSize: 14, color: "#64748b", lineHeight: 1.75 }}>{h.a}</div>
              )}
            </div>
          ))}
        </div>
      </main>
      <FloatingCart />
      <Footer />
    </div>
  );
}

/* ─── Main Help page ─────────────────────────────────────────────── */
export default function HelpPage() {
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  if (detail) return <DetailPage service={detail} onBack={() => setDetail(null)} navigate={navigate} location={location} />;

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>
      <Navbar navigate={navigate} location={location} />

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", padding: "52px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}>ศูนย์ช่วยเหลือ</p>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", margin: "0 0 10px" }}>🆘 Help Center</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, margin: 0, maxWidth: 500 }}>ค้นหาคำตอบและคำแนะนำสำหรับการใช้งานแพลตฟอร์ม LongLoy Market</p>
        </div>
      </section>

      <main className="rsp-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className="rsp-grid-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 }}>
          {SERVICES.map(s => <ServiceCard key={s.id} service={s} onRead={() => setDetail(s)} />)}
        </div>
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

function ServiceCard({ service, onRead }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: "1px solid rgba(226,232,240,0.6)",
      }}
    >
      {/* Image */}
      <div className="product-img" style={{ flexShrink: 0, background: "#f1f5f9", position: "relative" }}>
        <img src={service.image} alt={service.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }} />
        <span style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)",
          padding: "4px 12px", borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: "#334155",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
          {service.emoji} Help Center
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <p style={{
          fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 4px",
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
        }}>
          {service.title}
        </p>
        <p className="rsp-hide-mobile" style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5, flex: 1, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {service.description}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: "auto" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#4b8ff4" }}>อ่านเพิ่มเติม</span>
          <button onClick={onRead} aria-label="อ่านเพิ่มเติม" style={{
            width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#4b8ff4,#3a7de0)",
            color: "#fff", transition: "all 0.2s",
            boxShadow: hov ? "0 6px 16px rgba(75,143,244,0.4)" : "0 2px 8px rgba(75,143,244,0.3)",
          }}>
            <FaChevronRight style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
