// ============================================================
// App.jsx — Router หลักของแอป + หน้า Login/Register
//
// โครงสร้างภายในไฟล์นี้:
//   1. ProtectedRoute  — กั้นหน้าที่ต้อง login ก่อนเข้า
//   2. LoginPage       — ฟอร์ม login
//   3. RegisterPage    — ฟอร์มสมัครสมาชิก
//   4. App (default)   — ประกาศ Route ทั้งหมดของแอป
//
// การเพิ่ม route ใหม่ → ทำใน <Routes> ที่อยู่ใน function App()
// ============================================================

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import API_URL, { secureLocalFetch } from './config';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Homepage from './Homepage';
import Cart from './Cart';
import Payment from './Payment';
import OrderConfirmation from './OrderConfirmation';
import Profile from './Profile';
import ShopPage from './ShopPage';
import AddShopForm from './AddShopForm';
import AddShopToMarketForm from './AddShopToMarketForm';
import ShopProductPage from './ShopProductPage';
import GamePage from './GamePage';
import Market from './Market';
import EditShop from './EditShop';
import ShopOrders from './ShopOrders';
import UserOrders from './UserOrders';
import OrderDetail from './OrderDetail';
import MarketProfile from './MarketProfile';
import ShopProfile from './ShopProfile';
import ProductDetail from './ProductDetail';
import AdminDashboard from './AdminDashboard';
import Help from './Help';
import AddProduct from './AddProduct';
import ShopProducts from './ShopProducts';
import EditProduct from './EditProduct';
import EntrepreneurDashboard from './EntrepreneurDashboard';


// ── ProtectedRoute ────────────────────────────────────────────
// ห่อหน้าที่ต้อง login — ถ้าไม่มี token ใน localStorage จะ redirect ไป /login
// และจำ path เดิมไว้ใน "redirectTo" เพื่อกลับมาหลัง login สำเร็จ
function ProtectedRoute({ element }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    localStorage.setItem('redirectTo', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return element;
}

// ── CSS สำหรับ input ฟอร์ม Login/Register ────────────────────
const AUTH_CSS = `
  .auth-input {
    width:100%; padding:12px 14px; border:1.5px solid #e2e8f0;
    border-radius:10px; font-size:14px; font-family:inherit;
    box-sizing:border-box; color:#0f172a; background:#f8fafc;
    outline:none; transition:border-color 0.15s, background 0.15s;
  }
  .auth-input:focus { border-color:#4b8ff4 !important; background:#fff !important; }
  .auth-input.err   { border-color:#b87040 !important; background:#fff0e8 !important; }
  .auth-input.err:focus { border-color:#8d4d11 !important; }
`;

// ── ปุ่ม Social Login (Google / Facebook / Apple) ─────────────
function SocialBtn({ icon, color }) {
  return (
    <button type="button" style={{
      width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #e2e8f0',
      background: '#fff', cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: 20,
      transition: 'box-shadow 0.15s',
    }}>
      <i className={icon} style={{ color }}></i>
    </button>
  );
}

// ── ข้อความ error ใต้ field ──────────────────────────────────
const FieldErr = ({ msg }) => msg ? (
  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b3a0d', display: 'flex', alignItems: 'center', gap: 4 }}>
    <i className="fas fa-circle-exclamation" style={{ fontSize: 11 }} /> {msg}
  </p>
) : null;

// ── หน้า Login ───────────────────────────────────────────────
// - validate email/password ก่อน submit
// - POST /login → รับ token + user → เก็บใน localStorage
// - Admin → redirect /admin, User → redirect ตาม redirectTo
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();
  const emailRef = React.useRef(null);
  const passwordRef = React.useRef(null);

  const emailErr    = touched.email    && !email.trim()    ? 'กรุณากรอก Email / เบอร์โทร'
                     : touched.email    && email.length > 50    ? 'อีเมลต้องไม่เกิน 50 ตัวอักษร' : '';
  const passwordErr = touched.password && !password.trim() ? 'กรุณากรอกรหัสผ่าน'
                     : touched.password && password.length > 20 ? 'รหัสผ่านต้องไม่เกิน 20 ตัวอักษร' : '';

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    setLoginError('');
    if (!email.trim()) { emailRef.current?.focus(); return; }
    if (!password.trim()) { passwordRef.current?.focus(); return; }
    setLoginLoading(true);
    try {
      const res = await secureLocalFetch(`${API_URL}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user?.role === 'Admin') {
          localStorage.removeItem('redirectTo');
          navigate('/admin');
        } else {
          const redirectTo = localStorage.getItem('redirectTo') || '/';
          localStorage.removeItem('redirectTo');
          navigate(redirectTo);
        }
      } else { setLoginError(data.error || 'Email หรือ Password ไม่ถูกต้อง'); }
    } catch { setLoginError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'); }
    finally { setLoginLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #4b8ff4 50%, #7c3aed 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{AUTH_CSS}</style>
      <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-80, left:-80, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.05)', bottom:-60, right:-40, pointerEvents:'none' }} />

      <div style={{
        width: '100%', maxWidth: 420, background: '#fff',
        borderRadius: 24, padding: '40px 36px 32px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-longloy.png" alt="LongLoy" style={{ height: 56, marginBottom: 12 }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>ยินดีต้อนรับกลับมา</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#334155', fontSize: 13 }}>Email / เบอร์โทร</label>
            <input ref={emailRef} type="text" placeholder="กรอก email หรือเบอร์โทร" maxLength={50} value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), passwordRef.current?.focus())}
              className={`auth-input${emailErr ? ' err' : ''}`} />
            <FieldErr msg={emailErr} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#334155', fontSize: 13 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input ref={passwordRef} type={showPassword ? 'text' : 'password'} placeholder="กรอกรหัสผ่าน" maxLength={20} value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLogin())}
                className={`auth-input${passwordErr ? ' err' : ''}`}
                style={{ paddingRight: 46 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16 }}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <FieldErr msg={passwordErr} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <a href="#!" style={{ fontSize: 13, color: '#4b8ff4', textDecoration: 'none', fontWeight: 600 }}>ลืมรหัสผ่าน?</a>
          </div>

          {loginError && (
            <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 10, background: '#fff0e8', border: '1px solid #e8b895', color: '#4a2008', fontSize: 13 }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />{loginError}
            </div>
          )}

          <button type="submit" disabled={loginLoading} style={{
            width: '100%', padding: '13px', border: 'none', borderRadius: 12,
            background: loginLoading ? '#94a3b8' : 'linear-gradient(135deg,#4b8ff4,#7c3aed)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: loginLoading ? 'not-allowed' : 'pointer',
            boxShadow: loginLoading ? 'none' : '0 4px 16px rgba(75,143,244,0.35)',
            transition: 'all 0.2s', marginBottom: 20,
          }}>
            {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Social login removed per UX request */}

        <p style={{ textAlign:'center', fontSize:13, color:'#64748b', margin:0 }}>
          ยังไม่มีบัญชี? <Link to="/register" style={{ color:'#4b8ff4', fontWeight:700, textDecoration:'none' }}>สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
}

// ── หน้า Register ─────────────────────────────────────────────
// - validate ทุก field + password pattern (ต้องขึ้นต้นตัวใหญ่ + มีอักขระพิเศษ)
// - POST /register → หลังสำเร็จ redirect ไป /login
function RegisterPage() {
  const [name,           setName]           = useState('');
  const [lastname,       setLastname]       = useState('');
  const [tel,            setTel]            = useState('');
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [showRepeat,     setShowRepeat]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const navigate = useNavigate();

  const passwordPattern = /^[A-Z].*[!@#$%^&*(),.?":{}|<>]/;

  const fieldErrors = {
    name:           !name.trim()           ? 'กรุณากรอกชื่อ' 
                  : name.length > 20       ? 'ชื่อต้องไม่เกิน 20 ตัวอักษร' : '',
    lastname:       !lastname.trim()       ? 'กรุณากรอกนามสกุล' 
                  : lastname.length > 20   ? 'นามสกุลต้องไม่เกิน 20 ตัวอักษร' : '',
    tel:            !tel.trim()            ? 'กรุณากรอกเบอร์โทรศัพท์' 
                  : tel.length > 10        ? 'เบอร์โทรต้องไม่เกิน 10 ตัวอักษร' : '',
    email:          !email.trim()          ? 'กรุณากรอก Email' 
                  : email.length > 50      ? 'อีเมลต้องไม่เกิน 50 ตัวอักษร' : '',
    password:       !password.trim()       ? 'กรุณากรอกรหัสผ่าน'
                  : password.length > 20   ? 'รหัสผ่านต้องไม่เกิน 20 ตัวอักษร'
                  : !passwordPattern.test(password) ? 'ต้องขึ้นต้นตัวพิมพ์ใหญ่ + อักขระพิเศษ' : '',
    repeatPassword: !repeatPassword.trim() ? 'กรุณายืนยันรหัสผ่าน'
                  : password !== repeatPassword    ? 'รหัสผ่านไม่ตรงกัน' : '',
  };

  const hasFieldError = Object.values(fieldErrors).some(Boolean);
  const e_ = (k) => submitted ? fieldErrors[k] : '';
  const c_ = (k) => `auth-input${e_(k) ? ' err' : ''}`;

  const handleRegister = async () => {
    setSubmitted(true);
    setError('');
    if (hasFieldError) return;
    setLoading(true);
    try {
      const res = await secureLocalFetch(`${API_URL}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lastname, tel, email, password })
      });
      const data = await res.json();
      if (res.ok) { navigate('/login'); }
      else { setError(data.error || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่'); }
    } catch { setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #4b8ff4 50%, #7c3aed 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{AUTH_CSS}</style>
      <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-60, right:-60, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.05)', bottom:-40, left:-40, pointerEvents:'none' }} />

      <div style={{
        width: '100%', maxWidth: 460, background: '#fff',
        borderRadius: 24, padding: '36px 36px 28px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo-longloy.png" alt="LongLoy" style={{ height: 48, marginBottom: 10 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>สร้างบัญชีใหม่</h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#94a3b8' }}>กรอกข้อมูลด้านล่างเพื่อสมัครสมาชิก</p>
        </div>

        <form onSubmit={ev => { ev.preventDefault(); handleRegister(); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>ชื่อ *</label>
              <input placeholder="ชื่อจริง" maxLength={20} value={name} onChange={ev => setName(ev.target.value)}
                className={c_('name')} />
              <FieldErr msg={e_('name')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>นามสกุล *</label>
              <input placeholder="นามสกุล" maxLength={20} value={lastname} onChange={ev => setLastname(ev.target.value)}
                className={c_('lastname')} />
              <FieldErr msg={e_('lastname')} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>เบอร์โทรศัพท์ *</label>
            <input type="tel" placeholder="08X-XXX-XXXX" maxLength={10} value={tel} onChange={ev => setTel(ev.target.value)}
              className={c_('tel')} />
            <FieldErr msg={e_('tel')} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>Email *</label>
            <input type="email" placeholder="example@email.com" maxLength={50} value={email} onChange={ev => setEmail(ev.target.value)}
              className={c_('email')} />
            <FieldErr msg={e_('email')} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="ตัวพิมพ์ใหญ่+อักขระพิเศษ" maxLength={20} value={password}
                onChange={e => setPassword(e.target.value)}
                className={c_('password')} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:15 }}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <FieldErr msg={e_('password')} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#334155', fontSize: 13 }}>ยืนยัน Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showRepeat ? 'text' : 'password'} placeholder="กรอกรหัสผ่านอีกครั้ง" maxLength={20} value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)}
                className={c_('repeatPassword')} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowRepeat(v => !v)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:15 }}>
                <i className={`fas ${showRepeat ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <FieldErr msg={e_('repeatPassword')} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: '#fff0e8', border: '1px solid #e8b895', color: '#4a2008', fontSize: 13 }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />{error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', border: 'none', borderRadius: 12,
            background: loading ? '#94a3b8' : 'linear-gradient(135deg,#4b8ff4,#7c3aed)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(75,143,244,0.35)',
            marginBottom: 20, transition: 'all 0.2s',
          }}>
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>

        {/* Social login removed per UX request */}

        <p style={{ textAlign:'center', fontSize:13, color:'#64748b', margin:0 }}>
          มีบัญชีแล้ว? <Link to="/login" style={{ color:'#4b8ff4', fontWeight:700, textDecoration:'none' }}>เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}

// ── App — ประกาศ Route ทั้งหมด ─────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        {/* ── หน้าสาธารณะ — เข้าได้โดยไม่ต้อง login ── */}
        <Route path="/" element={<Homepage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/market" element={<Market />} />                                   {/* รายการตลาดน้ำ */}
        <Route path="/market-review/:market_id" element={<MarketProfile />} />          {/* โปรไฟล์ตลาด + รีวิว */}
        <Route path="/shop-profile/:shop_id" element={<ShopProfile />} />               {/* โปรไฟล์ร้านค้า */}
        <Route path="/shop-product/:shop_id" element={<ShopProductPage />} />           {/* สินค้าในร้าน (ลูกค้า) */}
        <Route path="/product/:product_id" element={<ProductDetail />} />               {/* รายละเอียดสินค้า */}
        <Route path="/help" element={<Help />} />                                       {/* คำถามที่พบบ่อย */}

        {/* ── หน้าที่ต้อง login — ห่อด้วย ProtectedRoute ── */}
        <Route path="/game" element={<ProtectedRoute element={<GamePage />} />} />                                    {/* เมนูเกม */}
        <Route path="/cart" element={<ProtectedRoute element={<Cart />} />} />                                        {/* ตะกร้าสินค้า */}
        <Route path="/payment" element={<ProtectedRoute element={<Payment />} />} />                                  {/* ชำระเงิน */}
        <Route path="/order-confirmation" element={<ProtectedRoute element={<OrderConfirmation />} />} />             {/* ยืนยันออเดอร์ */}
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />                                  {/* โปรไฟล์ผู้ใช้ */}
        <Route path="/user-orders" element={<ProtectedRoute element={<UserOrders />} />} />                           {/* ประวัติการสั่งซื้อ */}
        <Route path="/order-detail/:order_id" element={<ProtectedRoute element={<OrderDetail />} />} />               {/* รายละเอียดออเดอร์ */}
        <Route path="/shops/:market_id" element={<ProtectedRoute element={<ShopPage />} />} />                        {/* ร้านในตลาด */}
        <Route path="/my-shops" element={<ProtectedRoute element={<ShopPage />} />} />                                {/* ร้านของฉัน */}
        <Route path="/shop-orders/:shop_id" element={<ProtectedRoute element={<ShopOrders />} />} />                  {/* จัดการออเดอร์ (เจ้าของร้าน) */}
        <Route path="/addshop" element={<ProtectedRoute element={<AddShopForm />} />} />                              {/* สมัครเป็นผู้ประกอบการ */}
        <Route path="/addshop-to-market" element={<ProtectedRoute element={<AddShopToMarketForm />} />} />            {/* เพิ่มร้านเข้าตลาด */}
        <Route path="/editshop" element={<ProtectedRoute element={<EditShop />} />} />                                {/* แก้ไขข้อมูลร้าน */}
        <Route path="/entrepreneur-dashboard" element={<ProtectedRoute element={<EntrepreneurDashboard />} />} />     {/* Dashboard ผู้ประกอบการ */}
        <Route path="/admin" element={<ProtectedRoute element={<AdminDashboard />} />} />                             {/* Admin Panel */}
        <Route path="/add-product" element={<ProtectedRoute element={<AddProduct />} />} />                           {/* เพิ่มสินค้า */}
        <Route path="/shop-products" element={<ProtectedRoute element={<ShopProducts />} />} />                       {/* จัดการสินค้า */}
        <Route path="/edit-product/:product_id" element={<ProtectedRoute element={<EditProduct />} />} />             {/* แก้ไขสินค้า */}
      </Routes>
    </Router>
  );
}

export default App;
