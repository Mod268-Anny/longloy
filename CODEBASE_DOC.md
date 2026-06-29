# เอกสารอธิบายโค้ดโปรเจกต์ LongLoy

> อัปเดตล่าสุด: 2026-06-28  
> Stack: React + Vite (Frontend) · Node.js + Express (Backend) · MySQL · Socket.io · Omise Payment

---

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [ตาราง Database ทั้งหมด](#2-ตาราง-database-ทั้งหมด)
3. [Backend: server.js](#3-backend-serverjs)
4. [Config & Utilities](#4-config--utilities)
5. [Routing: App.jsx](#5-routing-appjsx)
6. [หน้าสาธารณะ (ไม่ต้อง Login)](#6-หน้าสาธารณะ-ไม่ต้อง-login)
7. [หน้าผู้ใช้ทั่วไป (ต้อง Login)](#7-หน้าผู้ใช้ทั่วไป-ต้อง-login)
8. [หน้าระบบเกม](#8-หน้าระบบเกม)
9. [หน้าผู้ประกอบการ (Entrepreneur)](#9-หน้าผู้ประกอบการ-entrepreneur)
10. [Admin Panel](#10-admin-panel)
11. [Components ที่ใช้ร่วมกัน](#11-components-ที่ใช้ร่วมกัน)
12. [API Utilities](#12-api-utilities)
13. [Flow การทำงานสำคัญ](#13-flow-การทำงานสำคัญ)

---

## 1. ภาพรวมโปรเจกต์

LongLoy เป็นแอปตลาดน้ำออนไลน์ (Floating Market E-Commerce) สำหรับ Thesis โดยมี 3 กลุ่มผู้ใช้:

| Role | คำอธิบาย |
|------|-----------|
| **User** | ลูกค้าทั่วไป — ดูสินค้า, ซื้อของ, เล่นเกม |
| **Entrepreneur** | เจ้าของร้านค้า — จัดการสินค้า/ออเดอร์ |
| **Admin** | ผู้ดูแลระบบ — อนุมัติร้าน, จัดการข้อมูล |

---

## 2. ตาราง Database ทั้งหมด

ฐานข้อมูล: `floating_LongLoy` (MySQL)

### ตารางหลัก

| ชื่อตาราง | เก็บข้อมูล | ใช้ใน |
|-----------|-----------|-------|
| `tbl_users` | บัญชีผู้ใช้ (ชื่อ, email, รหัสผ่าน, role, คะแนน) | Login, Register, Profile, Admin |
| `tbl_floating_markets` | ข้อมูลตลาดน้ำ (ชื่อ, ที่ตั้ง, รูปภาพ) | Homepage, Market, MarketProfile |
| `tbl_shops` | ข้อมูลร้านค้า (ชื่อ, เวลาเปิด/ปิด, สถานะ) | ShopPage, ShopProfile, ShopProductPage |
| `tbl_entrepreneurs` | ข้อมูลผู้ประกอบการ (ชื่อ-นามสกุล, เลขบัตร, บัญชีธนาคาร) | AddShopForm, EntrepreneurDashboard |
| `tbl_products` | สินค้า (ชื่อ, ราคา, รูปภาพ, หมวดหมู่) | Homepage, ShopProductPage, ProductDetail |
| `tbl_product_sizes` | ขนาด/ตัวเลือกของสินค้า (S/M/L, ราคาเพิ่ม) | ProductDetail, AddProduct, EditProduct |
| `tbl_orders` | ออเดอร์ (สถานะ, ยอดรวม, ช่องทางชำระ) | Cart, UserOrders, ShopOrders |
| `tbl_order_details` | รายการสินค้าในออเดอร์ (จำนวน, ราคา) | OrderDetail, ShopOrders, UserOrders |

### ตารางรีวิว

| ชื่อตาราง | เก็บข้อมูล | ใช้ใน |
|-----------|-----------|-------|
| `tbl_market_reviews` | รีวิวตลาดน้ำ (คะแนน, ความคิดเห็น) | MarketProfile, Market |
| `tbl_shop_reviews` | รีวิวร้านค้า (คะแนน, ความคิดเห็น) | ShopProfile, ShopPage |
| `tbl_product_reviews` | รีวิวสินค้า (คะแนน, ความคิดเห็น) | ShopProductPage, ProductDetail |

### ตารางระบบเกม/คะแนน

| ชื่อตาราง | เก็บข้อมูล | ใช้ใน |
|-----------|-----------|-------|
| `tbl_quests` | คำนิยาม Quest (ชื่อ, เป้าหมาย, รางวัล) | GamePage, GameContent (Admin) |
| `tbl_user_quests` | ความคืบหน้า Quest ของแต่ละ User | GamePage, GameBuyProduct, GameStepCounter |
| `tbl_quiz_questions` | คำถาม Quiz (คำถาม, ตัวเลือก A-D, คำตอบ) | GameQuiz, QuizManagement (Admin) |
| `tbl_quiz_daily_sessions` | บันทึกการเล่น Quiz รายวัน (1 ครั้ง/วัน) | GameQuiz |
| `user_steps` | จำนวนก้าวเดินของผู้ใช้ | GameStepCounter |

### ตารางรางวัล/คูปอง

| ชื่อตาราง | เก็บข้อมูล | ใช้ใน |
|-----------|-----------|-------|
| `tbl_rewards` | คูปอง/รางวัลที่แลกได้ (ส่วนลด, เงื่อนไข) | Cart, CouponManagement (Admin) |
| `tbl_coupon_usage` | ประวัติการใช้คูปอง | ActivityHistory (Admin) |
| `tbl_redemption_history` | ประวัติการแลกรางวัล | ActivityHistory (Admin) |

### ตาราง Payment/System

| ชื่อตาราง | เก็บข้อมูล | ใช้ใน |
|-----------|-----------|-------|
| `payment_logs` | บันทึก Transaction การชำระเงิน | ActivityHistory (Admin) |
| `tbl_settings` | ค่าตั้งค่าระบบ (ปิด/เปิดเกม, Multiplier) | GameContent (Admin) |

---

## 3. Backend: server.js

**ไฟล์:** [server.js](server.js)  
**ประเภท:** Express.js REST API  
**Port:** `process.env.PORT` หรือ 3000

### Tech Stack Backend

| Library | ใช้ทำอะไร |
|---------|----------|
| `express` | HTTP Server / Router |
| `mysql2` | เชื่อมต่อ MySQL Database |
| `bcryptjs` | Hash รหัสผ่าน |
| `jsonwebtoken` | สร้าง/ตรวจสอบ JWT Token (อายุ 7 วัน) |
| `socket.io` | Realtime notification ออเดอร์ใหม่ |
| `multer` | Upload รูปภาพสินค้า/ร้าน |

### API Endpoints ทั้งหมด

#### Auth
| Method | Path | หน้าที่ |
|--------|------|---------|
| POST | `/login` | เข้าสู่ระบบ → คืน JWT token |
| POST | `/register` | สมัครสมาชิก |

#### Markets
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/floating-markets/all` | ดึงตลาดทั้งหมด + จำนวนร้าน |
| GET | `/floating-markets/search?q=` | ค้นหาตลาด |

#### Shops
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/shops/by-market/:id` | ร้านในตลาดที่ระบุ |
| GET | `/shops/:shop_id` | ข้อมูลร้านค้าเดี่ยว |
| GET | `/entrepreneur-by-shop/:shop_id` | ข้อมูลร้าน + เจ้าของ |
| GET | `/entrepreneur/:user_id` | ข้อมูลผู้ประกอบการ |
| GET | `/my-shop` | ร้านของ user ที่ login (ต้อง Auth) |
| POST | `/add-entrepreneur` | สมัครเป็นผู้ประกอบการ |
| POST | `/edit-shop` | แก้ไขข้อมูลร้าน (ต้อง Auth) |

#### Products
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/products/by-shop/:shop_id` | สินค้าในร้าน |
| GET | `/product-detail/:product_id` | รายละเอียดสินค้า + sizes |
| POST | `/products/add` | เพิ่มสินค้าใหม่ |
| PUT | `/products/:product_id` | แก้ไขสินค้า |
| DELETE | `/products/:product_id` | ลบสินค้า |

#### Reviews
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET/POST | `/market-reviews/:market_id` | รีวิวตลาด |
| GET/POST | `/shop-reviews/:shop_id` | รีวิวร้าน |
| GET/POST | `/product-reviews/:product_id` | รีวิวสินค้า |

#### Cart & Orders
| Method | Path | หน้าที่ |
|--------|------|---------|
| POST | `/cart/add` | เพิ่มของเข้าตะกร้า (sync) |
| POST | `/orders/checkout` | สร้างออเดอร์ |
| GET | `/orders/user` | ออเดอร์ของ user (ต้อง Auth) |
| GET | `/orders/:order_id` | รายละเอียดออเดอร์ |
| GET | `/shop-orders/:shop_id` | ออเดอร์ในร้าน (ต้อง Auth) |
| PUT | `/orders/:order_id/status` | อัปเดตสถานะออเดอร์ |

#### Payment
| Method | Path | หน้าที่ |
|--------|------|---------|
| POST | `/payments/create-charge` | ชำระเงินผ่าน Omise |

#### Points & Steps
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/user/points` | คะแนนปัจจุบัน |
| POST | `/user/add-points` | เพิ่มคะแนน |
| POST | `/user/save-steps` | บันทึกก้าวเดิน |
| GET | `/user/steps` | ดึงข้อมูลก้าวเดิน |
| POST | `/user/exchange-steps-to-points` | แลกก้าวเป็นคะแนน |

#### Rewards & Coupons
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/rewards` | รายการรางวัลทั้งหมด |
| GET | `/user/my-coupons` | คูปองของ user |
| POST | `/coupons/validate` | ตรวจสอบความถูกต้องของคูปอง |

#### Quests
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/quests` | Quest ทั้งหมด |
| GET | `/user-quests` | ความคืบหน้า Quest ของ user |
| POST | `/quests/progress` | อัปเดต Quest progress |

#### Quiz
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/quiz/questions` | คำถาม Quiz วันนี้ |
| POST | `/quiz/submit` | ส่งคำตอบ + รับคะแนน |
| GET | `/quiz/today-session` | เช็คว่าเล่น Quiz วันนี้แล้วหรือยัง |

#### Admin (ต้องการ role = Admin)
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/admin/users` | รายชื่อผู้ใช้ทั้งหมด |
| PUT | `/admin/users/:id/ban` | แบน/ปลดแบน user |
| GET | `/admin/entrepreneurs/pending` | ผู้ประกอบการรอการอนุมัติ |
| PUT | `/admin/entrepreneurs/:id/approve` | อนุมัติร้านค้า |
| GET | `/admin/stats` | สถิติระบบ |
| GET | `/admin/activity` | ประวัติกิจกรรม |

#### Profile
| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/profile` | ข้อมูล user ที่ login |

---

## 4. Config & Utilities

### config.js
**ไฟล์:** [src/config.js](src/config.js)

กำหนด `API_URL` แบบ Dynamic ตาม environment:

| เงื่อนไข | API_URL |
|---------|---------|
| มี `VITE_API_URL` env | ใช้ค่านั้น |
| เปิดบน localhost | `http://localhost:3000` |
| เปิดบน ngrok domain | `""` (relative URL) |
| เปิดบน IP อื่น | `http://{hostname}:3000` |

**ฟังก์ชันสำคัญ:**

| ฟังก์ชัน | ทำอะไร |
|---------|--------|
| `secureLocalFetch(url, opts)` | wrapper ของ `fetch` ที่ auto-logout เมื่อถูก ban (response 403) |
| `resolveImg(src)` | แปลง path รูปภาพ → URL ที่ถูกต้อง (`/uploads/*` → ต่อ API_URL) |

### useCartCount.js
**ไฟล์:** [src/useCartCount.js](src/useCartCount.js)

Custom React Hook สำหรับนับจำนวนสินค้าในตะกร้า:
- อ่านจาก `localStorage`
- Re-render เมื่อมี event `cart-updated` (dispatch จาก Homepage/ShopProfile)
- ใช้ใน Navbar และ FloatingCart

---

## 5. Routing: App.jsx

**ไฟล์:** [src/App.jsx](src/App.jsx)

### ProtectedRoute
ห่อหน้าที่ต้อง login — ถ้าไม่มี token จะ redirect ไป `/login` และจำ path เดิมไว้

### หน้า Login
- Validate email + password ก่อน submit
- `POST /login` → เก็บ token + user ใน `localStorage`
- ถ้า role = `Admin` → ไป `/admin`
- ถ้า User ปกติ → ไปตาม `redirectTo`
- Password pattern: ต้องขึ้นต้นตัวพิมพ์ใหญ่ + มีอักขระพิเศษ (`!@#$%^&*...`)

### Routes ทั้งหมด (26 routes)

| Path | Component | ต้อง Login |
|------|-----------|-----------|
| `/` | Homepage | ไม่ |
| `/login` | LoginPage | ไม่ |
| `/register` | RegisterPage | ไม่ |
| `/market` | Market | ไม่ |
| `/market-review/:market_id` | MarketProfile | ไม่ |
| `/shop-profile/:shop_id` | ShopProfile | ไม่ |
| `/shop-product/:shop_id` | ShopProductPage | ไม่ |
| `/product/:product_id` | ProductDetail | ไม่ |
| `/help` | Help | ไม่ |
| `/game` | GamePage | **ใช่** |
| `/cart` | Cart | **ใช่** |
| `/payment` | Payment | **ใช่** |
| `/order-confirmation` | OrderConfirmation | **ใช่** |
| `/profile` | Profile | **ใช่** |
| `/user-orders` | UserOrders | **ใช่** |
| `/order-detail/:order_id` | OrderDetail | **ใช่** |
| `/shops/:market_id` | ShopPage | **ใช่** |
| `/shop-orders/:shop_id` | ShopOrders | **ใช่** |
| `/addshop` | AddShopForm | **ใช่** |
| `/addshop-to-market` | AddShopToMarketForm | **ใช่** |
| `/editshop` | EditShop | **ใช่** |
| `/entrepreneur-dashboard` | EntrepreneurDashboard | **ใช่** |
| `/admin` | AdminDashboard | **ใช่** |
| `/add-product` | AddProduct | **ใช่** |
| `/shop-products` | ShopProducts | **ใช่** |
| `/edit-product/:product_id` | EditProduct | **ใช่** |

---

## 6. หน้าสาธารณะ (ไม่ต้อง Login)

---

### Homepage.jsx
**ไฟล์:** [src/Homepage.jsx](src/Homepage.jsx)  
**Route:** `/`

**หน้าที่:** หน้าหลักของแอป มี Hero Carousel, กริดสินค้า, ค้นหาตลาด, Cart sidebar

**ตาราง Database ที่ใช้:**
- `tbl_floating_markets` — แสดงรายการตลาด, ค้นหาตลาด
- `tbl_shops` — ดึงร้านในแต่ละตลาด
- `tbl_products` — แสดงสินค้าทั้งหมดในกริด

**State หลัก:**

| State | ประเภท | ใช้ทำอะไร |
|-------|--------|----------|
| `heroIdx`, `fade` | number, boolean | ควบคุม Hero Carousel (เลื่อนทุก 4.5 วินาที) |
| `markets`, `allMarkets` | array | รายการตลาดทั้งหมด + ตลาดที่ filter แล้ว |
| `products` | array | สินค้าทั้งหมด (พร้อม market/shop info) |
| `srchTerm`, `dropdown` | string, boolean | ค้นหาตลาดแบบ Dropdown |
| `filter` | string | กรองสินค้าตามตลาด |
| `prodSrch` | string | ค้นหาสินค้า |
| `prodPage` | number | หน้าปัจจุบัน (Pagination 9 ชิ้น/หน้า) |
| `cart`, `cartOpen` | array, boolean | ข้อมูลตะกร้า + สถานะเปิด/ปิด Sidebar |
| `loadingMarkets`, `loadingProducts` | boolean | Loading state |

**API Calls:**
- `GET /floating-markets/search?q=` — ค้นหาตลาด (Debounce)
- `GET /floating-markets/all` — ดึงตลาดทั้งหมด
- `GET /shops/by-market/:id` — ดึงร้านในตลาด
- `GET /products/by-shop/:id` — ดึงสินค้าต่อร้าน

**ฟังก์ชันสำคัญ:**

| ฟังก์ชัน | ทำอะไร |
|---------|--------|
| `addToCart(product)` | เพิ่มสินค้าลงตะกร้า (ตรวจสอบว่าเป็นร้านเดียวกัน) |
| `removeItem(id)` | ลบสินค้าออกจากตะกร้า |
| `changeQty(id, delta)` | เพิ่ม/ลดจำนวนสินค้า |
| `slide(dir)` | เลื่อน Hero Carousel ด้วยมือ |
| `saveCart(newCart)` | บันทึกตะกร้าใน localStorage + dispatch event |

---

### Market.jsx
**ไฟล์:** [src/Market.jsx](src/Market.jsx)  
**Route:** `/market`

**หน้าที่:** แสดงรายการตลาดน้ำทั้งหมด พร้อม Filter และ Sort

**ตาราง Database ที่ใช้:**
- `tbl_floating_markets` — รายการตลาดทั้งหมด
- `tbl_market_reviews` — รีวิวตลาด (คำนวณ avg rating)

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `markets` | ตลาดทั้งหมดจาก API |
| `filtered` | ตลาดหลัง apply filter/sort |
| `marketRatings` | `{ market_id: { avg, count } }` คะแนนเฉลี่ยของแต่ละตลาด |
| `sortBy` | เรียงตาม: default / rating-high / rating-low / name-az |
| `minRating` | กรองตลาดที่มีคะแนน ≥ ค่านี้ |

**API Calls:**
- `GET /floating-markets/all` — ดึงตลาดทั้งหมด
- `GET /market-reviews/:market_id` — ดึงรีวิวต่อตลาด (loop ทุกตลาด)

**ฟีเจอร์:**
- Sort: Default, คะแนน High→Low, คะแนน Low→High, ชื่อ A→Z
- Filter: คะแนนขั้นต่ำ (0.0 – 5.0)
- Card แต่ละตลาดแสดง: รูป, ชื่อ, ที่ตั้ง, ★ rating, จำนวนรีวิว, จำนวนร้าน
- ปุ่ม 2 อัน: "โปรไฟล์" (ไป `/market-review/:id`) และ "สำรวจ" (ไป `/shops/:id`)

---

### MarketProfile.jsx
**ไฟล์:** [src/MarketProfile.jsx](src/MarketProfile.jsx)  
**Route:** `/market-review/:market_id`

**หน้าที่:** โปรไฟล์ตลาดน้ำ + ฟอร์มรีวิว + รายการรีวิว

**ตาราง Database ที่ใช้:**
- `tbl_floating_markets` — ข้อมูลตลาด (ชื่อ, รูป, ที่ตั้ง)
- `tbl_market_reviews` — รีวิวตลาด (อ่าน + เพิ่มใหม่)

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `market` | ข้อมูลตลาดที่เลือก |
| `reviews` | รายการรีวิวทั้งหมด |
| `newReview` | `{ reviewer_name, comment, rating }` — form state |
| `hoverStar` | ดาวที่ hover อยู่ (ใน rating picker) |
| `submitting`, `error`, `success` | สถานะ submit form |

**API Calls:**
- `GET /floating-markets/all` — ดึงตลาดแล้ว filter ด้วย `market_id`
- `GET /market-reviews/:market_id` — ดึงรีวิวทั้งหมด
- `POST /market-reviews/:market_id` — ส่งรีวิวใหม่

**ฟีเจอร์:**
- คำนวณ avg rating จาก reviews array
- แต่ละรีวิวแสดง: Avatar (สี gradient ตามคะแนน), ชื่อ, ดาว, ความเห็น, วันที่

---

### ShopPage.jsx
**ไฟล์:** [src/ShopPage.jsx](src/ShopPage.jsx)  
**Route:** `/shops/:market_id`

**หน้าที่:** รายการร้านค้าในตลาดที่ระบุ

**ตาราง Database ที่ใช้:**
- `tbl_floating_markets` — ชื่อตลาด (สำหรับ Header)
- `tbl_shops` — รายการร้านในตลาด
- `tbl_shop_reviews` — รีวิวร้าน (คำนวณ avg rating)
- `tbl_entrepreneurs` — ข้อมูลเจ้าของร้าน

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `shops`, `filteredShops` | ร้านทั้งหมด + หลัง filter |
| `shopRatings` | `{ shop_id: { avg, count } }` |
| `searchTerm` | ค้นหาชื่อร้าน |
| `sortBy` | เรียงตาม: open-first / closed-first / rating / name-az |
| `cartShopId` | shop_id ที่อยู่ในตะกร้าตอนนี้ (lock ร้านอื่น) |

**API Calls:**
- `GET /floating-markets/all` — ดึงชื่อตลาด
- `GET /shops/by-market/:market_id` — ดึงร้านในตลาด
- `GET /shop-reviews/:shop_id` — ดึงรีวิวต่อร้าน (loop)

**ฟีเจอร์:**
- ร้านที่ถูก lock (ตะกร้าของร้านอื่น) จะมีไอคอนกุญแจ
- Badge "เปิด/ปิด" สีต่างกัน
- ปุ่ม: "โปรไฟล์" (ไป `/shop-profile/:id`) และ "สำรวจ" (ไป `/shop-product/:id`)

---

### ShopProfile.jsx
**ไฟล์:** [src/ShopProfile.jsx](src/ShopProfile.jsx)  
**Route:** `/shop-profile/:shop_id`

**หน้าที่:** โปรไฟล์ร้านค้า + แสดงสินค้า + ฟอร์มรีวิว

**ตาราง Database ที่ใช้:**
- `tbl_shops` — ข้อมูลร้าน
- `tbl_entrepreneurs` — ข้อมูลเจ้าของร้าน
- `tbl_products` — สินค้าในร้าน
- `tbl_shop_reviews` — รีวิวร้าน (อ่าน + เพิ่ม)

**API Calls:**
- `GET /entrepreneur-by-shop/:shop_id` — ข้อมูลร้าน + เจ้าของ
- `GET /products/by-shop/:shop_id` — สินค้าพร้อม sizes
- `GET /shop-reviews/:shop_id` — รีวิวร้าน
- `POST /shop-reviews/:shop_id` — ส่งรีวิวใหม่
- `POST /cart/add` — sync ตะกร้ากับ backend เมื่อเพิ่มสินค้า

**ฟีเจอร์:**
- ปุ่ม "เพิ่มลงตะกร้า" → แสดง "✓ เพิ่มแล้ว" สีเขียวชั่วคราว (1.5 วินาที)
- ตรวจสอบ 1 ตะกร้า = 1 ร้าน

---

### ShopProductPage.jsx
**ไฟล์:** [src/ShopProductPage.jsx](src/ShopProductPage.jsx)  
**Route:** `/shop-product/:shop_id`

**หน้าที่:** หน้าซื้อสินค้าในร้าน พร้อม Filter ขั้นสูง

**ตาราง Database ที่ใช้:**
- `tbl_shops` — ข้อมูลร้าน (header)
- `tbl_products` — สินค้าในร้าน
- `tbl_product_reviews` — rating เฉลี่ยต่อสินค้า

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `shop` | ข้อมูลร้าน |
| `products`, `filtered` | สินค้าทั้งหมด + หลัง apply filter |
| `searchTerm` | ค้นหาชื่อสินค้า |
| `sortBy` | เรียงตาม: default / price-low / price-high / rating |
| `priceRange` | `[min, max]` filter ราคา |
| `minRating` | rating ขั้นต่ำ |
| `cart`, `addedSet` | ตะกร้า + สินค้าที่เพิ่งเพิ่ม |

**ฟีเจอร์:**
- Filter หลายมิติ: ชื่อ, ราคา, rating, เรียงลำดับ
- ปุ่ม Reset Filters ล้างค่าทั้งหมด
- Add to Cart ตรวจสอบ 1 ร้านต่อตะกร้า

---

### ProductDetail.jsx
**ไฟล์:** [src/ProductDetail.jsx](src/ProductDetail.jsx)  
**Route:** `/product/:product_id`

**หน้าที่:** หน้ารายละเอียดสินค้า

**ตาราง Database ที่ใช้:**
- `tbl_products` — ข้อมูลสินค้า
- `tbl_product_sizes` — ขนาด/ตัวเลือก (ปรับราคา)
- `tbl_shops` — ข้อมูลร้านของสินค้า
- `tbl_floating_markets` — ตลาดที่ร้านอยู่ (สำหรับ "สินค้าที่เกี่ยวข้อง")

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `product` | สินค้าพร้อม sizes |
| `tab` | แท็บที่แสดง: `description` / `info` |
| `qty` | จำนวนที่จะเพิ่มลงตะกร้า |
| `activeImg` | index รูปที่แสดงอยู่ |
| `selectedSize` | size ที่เลือก (กระทบราคา) |
| `related` | สินค้าจากร้าน/ตลาดเดียวกัน |
| `addedMsg` | ข้อความยืนยัน "เพิ่มแล้ว" |

**API Calls:**
- `GET /product-detail/:product_id` — สินค้า + sizes
- `GET /shops/by-market/:market_id` → `GET /products/by-shop/:shop_id` — สินค้าที่เกี่ยวข้อง

**ฟีเจอร์:**
- Gallery รูปภาพ + Thumbnail
- เลือก Size → ราคาปรับอัตโนมัติ
- Tab "รายละเอียด" และ "ข้อมูลสินค้า"
- กริดสินค้าที่เกี่ยวข้อง

---

### Help.jsx
**ไฟล์:** [src/Help.jsx](src/Help.jsx)  
**Route:** `/help`

**หน้าที่:** หน้า FAQ / คำถามที่พบบ่อย  
**ตาราง Database:** ไม่มี (Static content)

---

## 7. หน้าผู้ใช้ทั่วไป (ต้อง Login)

---

### Cart.jsx
**ไฟล์:** [src/Cart.jsx](src/Cart.jsx)  
**Route:** `/cart`

**หน้าที่:** ตะกร้าสินค้า + คูปอง + Checkout

**ตาราง Database ที่ใช้:**
- `tbl_orders` — สร้างออเดอร์ใหม่
- `tbl_rewards` — รายการคูปอง/รางวัล
- `tbl_products` — ข้อมูลสินค้า (sync qty)

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `cartItems` | รายการสินค้า (จาก localStorage) |
| `couponCode` | โค้ดคูปองที่พิมพ์ |
| `couponDiscount` | ส่วนลดที่ได้จากคูปอง |
| `selectedRedeemId` | reward_id ที่เลือกใช้ |
| `myCoupons` | คูปองที่ user มี |
| `isCheckingOut` | กำลัง checkout อยู่ |

**API Calls:**
- `GET /user/my-coupons` — คูปองของ user
- `POST /coupons/validate` — ตรวจสอบคูปอง
- `POST /orders/checkout` — สร้างออเดอร์

**การคำนวณราคา:**
```
subTotal      = sum(price × qty)
delivery      = 0 (ฟรี)
couponDiscount = ส่วนลดจากคูปอง/reward
total         = subTotal - couponDiscount
```

**Flow การชำระเงิน:**
- เลือก "บัตรเครดิต" → redirect ไป `/payment`
- เลือก "เงินสด" → confirm ทันที → redirect ไป `/order-confirmation`

---

### Payment.jsx
**ไฟล์:** [src/Payment.jsx](src/Payment.jsx)  
**Route:** `/payment`

**หน้าที่:** ชำระเงินด้วยบัตรเครดิต (Omise)

**ตาราง Database ที่ใช้:**
- `payment_logs` — บันทึก transaction (via backend)

**State หลัก:**

| State | ใช้ทำอะไร |
|-------|----------|
| `cardName`, `cardNumber` | ข้อมูลบัตร |
| `expiryMonth`, `expiryYear`, `cvv` | รายละเอียดบัตร |
| `isProcessing`, `error` | สถานะการชำระ |

**Flow:**
1. User กรอกข้อมูลบัตร
2. Validate (16 หลัก, expiry ไม่เกิน, CVV 3 หลัก)
3. `Omise.createToken()` — สร้าง token จาก client
4. `POST /payments/create-charge` — ส่ง token ไป backend
5. Backend ติดต่อ Omise API → redirect `/order-confirmation`

**ฟีเจอร์:**
- Card Preview แสดง live ตามที่พิมพ์
- ปุ่มเติม Test Card อัตโนมัติ (4242 4242 4242 4242)
- Step Indicator: Cart → Payment → Confirmation

---

### OrderConfirmation.jsx
**ไฟล์:** [src/OrderConfirmation.jsx](src/OrderConfirmation.jsx)  
**Route:** `/order-confirmation`

**หน้าที่:** หน้ายืนยันออเดอร์สำเร็จ  

**ตาราง Database ที่ใช้:**
- `tbl_orders` — แสดง order_id และรายละเอียด

**ฟีเจอร์:**
- แสดง Order ID, รายการสินค้า, ยอดรวม
- ปุ่ม: "ดูออเดอร์ของฉัน" / "ช้อปต่อ" / "กลับหน้าหลัก"
- Clear ตะกร้า localStorage หลังยืนยัน

---

### OrderDetail.jsx
**ไฟล์:** [src/OrderDetail.jsx](src/OrderDetail.jsx)  
**Route:** `/order-detail/:order_id`

**หน้าที่:** รายละเอียดออเดอร์เดี่ยว

**ตาราง Database ที่ใช้:**
- `tbl_orders` — ข้อมูลออเดอร์ (สถานะ, ยอดรวม, ช่องทางชำระ)
- `tbl_order_details` — สินค้าในออเดอร์
- `tbl_products` — รูปภาพสินค้า

**สถานะออเดอร์:**
`AwaitingPayment` → `Pending` → `Confirmed` → `Cooking` → `Completed` / `Cancelled`

---

### UserOrders.jsx
**ไฟล์:** [src/UserOrders.jsx](src/UserOrders.jsx)  
**Route:** `/user-orders`

**หน้าที่:** ประวัติการสั่งซื้อทั้งหมดของ user

**ตาราง Database ที่ใช้:**
- `tbl_orders` — รายการออเดอร์ + สถานะ
- `tbl_order_details` — รายการสินค้าในแต่ละออเดอร์

**ฟีเจอร์:**
- กรองตามสถานะ (All / Pending / Confirmed / Completed / Cancelled)
- คลิกออเดอร์ → ไป `/order-detail/:order_id`

---

### Profile.jsx
**ไฟล์:** [src/Profile.jsx](src/Profile.jsx)  
**Route:** `/profile`

**หน้าที่:** โปรไฟล์ผู้ใช้ + ข้อมูลคะแนน

**ตาราง Database ที่ใช้:**
- `tbl_users` — ชื่อ, email, เบอร์, คะแนน, วันหมดอายุคะแนน
- `tbl_entrepreneurs` — ถ้า user เป็นผู้ประกอบการ
- `tbl_shops` — ร้านของผู้ประกอบการ

**ฟีเจอร์:**
- แสดงข้อมูลส่วนตัว
- แสดงยอดคะแนนสะสมและวันหมดอายุ
- ปุ่ม Logout (ล้าง localStorage + redirect `/login`)

---

## 8. หน้าระบบเกม

---

### GamePage.jsx
**ไฟล์:** [src/GamePage.jsx](src/GamePage.jsx)  
**Route:** `/game`

**หน้าที่:** Hub เมนูเกมทั้งหมด

**ตาราง Database ที่ใช้:**
- `tbl_quests` — รายการ Quest ทั้งหมด
- `tbl_user_quests` — ความคืบหน้า Quest ของ user
- `tbl_quiz_daily_sessions` — เช็คว่าเล่น Quiz วันนี้แล้วหรือยัง

**ฟีเจอร์:**
- แสดง 3 เกม: Quiz, ซื้อสินค้า, นับก้าว
- แสดง Quest ที่กำลังทำ + Progress Bar
- แสดงสถานะ "เล่นแล้ววันนี้" สำหรับ Quiz

---

### games/GameQuiz.jsx
**ไฟล์:** [src/games/GameQuiz.jsx](src/games/GameQuiz.jsx)

**หน้าที่:** เกมตอบคำถาม Quiz รายวัน

**ตาราง Database ที่ใช้:**
- `tbl_quiz_questions` — คำถาม + ตัวเลือก A/B/C/D + เฉลย
- `tbl_quiz_daily_sessions` — บันทึกว่า user เล่นวันนี้แล้ว (1 ครั้ง/วัน)
- `tbl_user_quests` — อัปเดต Quest progress เมื่อทำ Quiz เสร็จ

**Flow:**
1. เช็ค `tbl_quiz_daily_sessions` — ถ้าเล่นแล้ว → แสดงสถานะ "เล่นแล้ววันนี้"
2. ดึง 5 คำถามจาก `tbl_quiz_questions`
3. ตอบคำถาม A/B/C/D
4. `POST /quiz/submit` → รับคะแนน + บันทึก session

---

### games/GameBuyProduct.jsx
**ไฟล์:** [src/games/GameBuyProduct.jsx](src/games/GameBuyProduct.jsx)

**หน้าที่:** เกมสะสมคะแนนจากการซื้อสินค้า

**ตาราง Database ที่ใช้:**
- `tbl_orders` — ตรวจสอบออเดอร์ที่ Completed
- `tbl_user_quests` — อัปเดต Quest progress
- `tbl_quests` — เป้าหมาย Quest

**Flow:**
- ดึงออเดอร์ที่ `Completed` → คำนวณความคืบหน้า
- ครบเป้าหมาย → อัปเดต Quest + รับคะแนน

---

### games/GameStepCounter.jsx
**ไฟล์:** [src/games/GameStepCounter.jsx](src/games/GameStepCounter.jsx)

**หน้าที่:** นับก้าวเดิน → แลกเป็นคะแนน

**ตาราง Database ที่ใช้:**
- `user_steps` — บันทึกก้าวเดินรายวัน
- `tbl_user_quests` — Quest ที่เกี่ยวกับก้าวเดิน
- `tbl_quests` — เป้าหมาย Quest

**API Calls:**
- `GET /user/steps` — ดึงจำนวนก้าวปัจจุบัน
- `POST /user/save-steps` — บันทึกก้าวใหม่
- `POST /user/exchange-steps-to-points` — แลกก้าวเป็นคะแนน

---

## 9. หน้าผู้ประกอบการ (Entrepreneur)

---

### AddShopForm.jsx
**ไฟล์:** [src/AddShopForm.jsx](src/AddShopForm.jsx)  
**Route:** `/addshop`

**หน้าที่:** ฟอร์มสมัครเป็นผู้ประกอบการ + สร้างร้าน

**ตาราง Database ที่ใช้:**
- `tbl_entrepreneurs` — สร้างข้อมูลผู้ประกอบการ
- `tbl_shops` — สร้างร้านใหม่ (สถานะ Pending รอ Admin อนุมัติ)

**ข้อมูลที่กรอก:**
- ชื่อร้าน, หมายเลขร้าน, หมวดหมู่
- เบอร์โทร, เวลาเปิด-ปิด, ที่ตั้ง
- ชื่อ-นามสกุล เจ้าของ, เลขบัตรประชาชน
- บัญชีธนาคาร, ชื่อบัญชี
- เลือกตลาดที่ต้องการเข้าร่วม

**API Calls:**
- `POST /add-entrepreneur` — สร้างข้อมูล entrepreneur + shop

---

### EditShop.jsx
**ไฟล์:** [src/EditShop.jsx](src/EditShop.jsx)  
**Route:** `/editshop`

**หน้าที่:** แก้ไขข้อมูลร้านค้า

**ตาราง Database ที่ใช้:**
- `tbl_shops` — ดึงและอัปเดตข้อมูลร้าน
- `tbl_entrepreneurs` — ข้อมูลเจ้าของ

**API Calls:**
- `GET /my-shop` — โหลดข้อมูลร้านปัจจุบัน
- `POST /edit-shop` — บันทึกการแก้ไข

---

### AddShopToMarketForm.jsx
**ไฟล์:** [src/AddShopToMarketForm.jsx](src/AddShopToMarketForm.jsx)  
**Route:** `/addshop-to-market`

**หน้าที่:** เพิ่มร้านที่มีอยู่แล้วเข้าตลาดใหม่ (รองรับ Multi-location)

**ตาราง Database ที่ใช้:**
- `tbl_shops` — ร้านของผู้ประกอบการ
- `tbl_floating_markets` — รายการตลาดที่เลือกได้

---

### AddProduct.jsx
**ไฟล์:** [src/AddProduct.jsx](src/AddProduct.jsx)  
**Route:** `/add-product`

**หน้าที่:** เพิ่มสินค้าใหม่

**ตาราง Database ที่ใช้:**
- `tbl_products` — บันทึกสินค้าใหม่
- `tbl_product_sizes` — บันทึก size variants (สูงสุด 5 size)

**ข้อมูลที่กรอก:**
- ชื่อสินค้า, หมวดหมู่, คำอธิบาย
- ราคาพื้นฐาน, หน่วย
- รูปภาพ (อัปโหลด)
- Size variants: ชื่อ size + ราคาเพิ่ม/ลด
- เปิด/ปิดขาย

**API Calls:**
- `POST /products/add` — บันทึกสินค้า + sizes

---

### EditProduct.jsx
**ไฟล์:** [src/EditProduct.jsx](src/EditProduct.jsx)  
**Route:** `/edit-product/:product_id`

**หน้าที่:** แก้ไขสินค้าที่มีอยู่

**ตาราง Database ที่ใช้:**
- `tbl_products` — ดึงและอัปเดตสินค้า
- `tbl_product_sizes` — ดึงและอัปเดต sizes

**API Calls:**
- `GET /product-detail/:product_id` — โหลดสินค้าเดิม
- `PUT /products/:product_id` — บันทึกการแก้ไข

---

### ShopProducts.jsx
**ไฟล์:** [src/ShopProducts.jsx](src/ShopProducts.jsx)  
**Route:** `/shop-products`

**หน้าที่:** หน้าจัดการสินค้าของร้าน (สำหรับผู้ประกอบการ)

**ตาราง Database ที่ใช้:**
- `tbl_products` — รายการสินค้าของร้าน
- `tbl_shops` — ข้อมูลร้าน
- `tbl_entrepreneurs` — ตรวจสอบ entrepreneur status

**API Calls:**
- `GET /profile` — ดึง user ปัจจุบัน
- `GET /entrepreneur/:user_id` — ดึงข้อมูล entrepreneur
- `GET /products/by-shop/:shop_id` — สินค้าในร้าน
- `DELETE /products/:product_id` — ลบสินค้า (พร้อม confirm dialog)

---

### ShopOrders.jsx
**ไฟล์:** [src/ShopOrders.jsx](src/ShopOrders.jsx)  
**Route:** `/shop-orders/:shop_id`

**หน้าที่:** จัดการออเดอร์ที่เข้ามาในร้าน

**ตาราง Database ที่ใช้:**
- `tbl_orders` — รายการออเดอร์ของร้าน
- `tbl_order_details` — สินค้าในแต่ละออเดอร์
- `tbl_products` — ชื่อ/รูปสินค้า

**ฟีเจอร์:**
- แสดง: ชื่อลูกค้า, เบอร์, รายการสินค้า, วิธีชำระ, ที่อยู่, หมายเหตุ, ยอดรวม
- อัปเดตสถานะ: `Pending` → `Confirmed` → `Cooking` → `Completed`

**API Calls:**
- `GET /shop-orders/:shop_id` — ออเดอร์ทั้งหมดของร้าน
- `PUT /orders/:order_id/status` — เปลี่ยนสถานะออเดอร์

---

### EntrepreneurDashboard.jsx
**ไฟล์:** [src/EntrepreneurDashboard.jsx](src/EntrepreneurDashboard.jsx)  
**Route:** `/entrepreneur-dashboard`

**หน้าที่:** Dashboard หลักของผู้ประกอบการ

**ตาราง Database ที่ใช้:**
- `tbl_products` — จำนวนสินค้าทั้งหมด
- `tbl_orders` — ออเดอร์ทั้งหมดของร้าน + รายได้
- `tbl_shops` — ข้อมูลร้าน + toggle เปิด/ปิด
- `tbl_entrepreneurs` — ข้อมูลผู้ประกอบการ

**Tab ทั้งหมด:**
| Tab | เนื้อหา |
|-----|---------|
| Dashboard | Stats: สินค้า, ออเดอร์รอ, รายได้รวม |
| Products | รายการสินค้า (link ไป ShopProducts) |
| Orders | รายการออเดอร์ (link ไป ShopOrders) |
| Analytics | กราฟยอดขายรายวัน/รายเดือน (RealtimeStatsChart) |
| Shop Settings | แก้ไขข้อมูลร้าน, toggle เปิด/ปิด |

---

## 10. Admin Panel

---

### AdminDashboard.jsx
**ไฟล์:** [src/AdminDashboard.jsx](src/AdminDashboard.jsx)  
**Route:** `/admin`

**หน้าที่:** Admin Control Panel หลัก

**ตาราง Database ที่ใช้:** ขึ้นอยู่กับ Tab ที่เปิด (ดู Sub-components ด้านล่าง)

**Tab ทั้งหมด:**
| Tab | Component | คำอธิบาย |
|-----|-----------|----------|
| Dashboard | DashboardStats | ภาพรวมระบบ |
| Users | UserManagement | จัดการผู้ใช้ |
| Approvals | EntrepreneurApprovals | อนุมัติร้านค้า |
| Coupons | CouponManagement | จัดการคูปอง |
| Quiz | QuizManagement | จัดการคำถาม Quiz |
| Games | GameContent | ตั้งค่าเกม |
| Activity | ActivityHistory | ประวัติกิจกรรม |

---

### AdminPanel/DashboardStats.jsx
**ไฟล์:** [src/AdminPanel/DashboardStats.jsx](src/AdminPanel/DashboardStats.jsx)

**หน้าที่:** แสดง Stats ภาพรวมของระบบ

**ตาราง Database ที่ใช้:**
- `tbl_users` — จำนวนผู้ใช้ทั้งหมด
- `tbl_orders` — จำนวน/รายได้ออเดอร์
- `tbl_shops` — จำนวนร้านค้า
- `tbl_products` — จำนวนสินค้า

**แสดงข้อมูล:**
- ยอดผู้ใช้, ร้านค้า, สินค้า, ออเดอร์
- รายได้รวม
- ตลาด/ร้านที่ทำยอดดีที่สุด

---

### AdminPanel/UserManagement.jsx
**ไฟล์:** [src/AdminPanel/UserManagement.jsx](src/AdminPanel/UserManagement.jsx)

**หน้าที่:** จัดการบัญชีผู้ใช้

**ตาราง Database ที่ใช้:**
- `tbl_users` — รายชื่อ, role, สถานะ banned

**ฟีเจอร์:**
- ค้นหาผู้ใช้
- แบน/ปลดแบนบัญชี
- เปลี่ยน Role
- ลบบัญชี

**API Calls:**
- `GET /admin/users` — รายชื่อ user ทั้งหมด
- `PUT /admin/users/:id/ban` — แบน/ปลดแบน

---

### AdminPanel/EntrepreneurApprovals.jsx
**ไฟล์:** [src/AdminPanel/EntrepreneurApprovals.jsx](src/AdminPanel/EntrepreneurApprovals.jsx)

**หน้าที่:** อนุมัติ/ปฏิเสธการสมัครเป็นผู้ประกอบการ

**ตาราง Database ที่ใช้:**
- `tbl_entrepreneurs` — รายการที่รอการอนุมัติ
- `tbl_shops` — อัปเดตสถานะร้านหลังอนุมัติ

**API Calls:**
- `GET /admin/entrepreneurs/pending` — รายการที่รอ
- `PUT /admin/entrepreneurs/:id/approve` — อนุมัติ
- `PUT /admin/entrepreneurs/:id/reject` — ปฏิเสธ

---

### AdminPanel/CouponManagement.jsx
**ไฟล์:** [src/AdminPanel/CouponManagement.jsx](src/AdminPanel/CouponManagement.jsx)

**หน้าที่:** สร้างและจัดการคูปอง/รางวัล

**ตาราง Database ที่ใช้:**
- `tbl_rewards` — รายการคูปอง (สร้าง/แก้ไข/ลบ)
- `tbl_coupon_usage` — สถิติการใช้คูปอง

**ข้อมูลคูปอง:**
- รหัสคูปอง, ส่วนลด (บาท/%), วันหมดอายุ, จำนวนที่ใช้ได้

---

### AdminPanel/QuizManagement.jsx
**ไฟล์:** [src/AdminPanel/QuizManagement.jsx](src/AdminPanel/QuizManagement.jsx)

**หน้าที่:** จัดการคำถาม Quiz

**ตาราง Database ที่ใช้:**
- `tbl_quiz_questions` — คำถาม, ตัวเลือก A/B/C/D, เฉลย, คะแนน

**ฟีเจอร์:**
- เพิ่ม/แก้ไข/ลบคำถาม
- กำหนดคะแนนต่อคำถาม

---

### AdminPanel/GameContent.jsx
**ไฟล์:** [src/AdminPanel/GameContent.jsx](src/AdminPanel/GameContent.jsx)

**หน้าที่:** ตั้งค่าระบบเกม

**ตาราง Database ที่ใช้:**
- `tbl_quests` — Quest definitions (เพิ่ม/แก้ไข/ลบ)
- `tbl_settings` — ค่าตั้งค่าระบบ (เปิด/ปิดเกม, Point multiplier)

---

### AdminPanel/ActivityHistory.jsx
**ไฟล์:** [src/AdminPanel/ActivityHistory.jsx](src/AdminPanel/ActivityHistory.jsx)

**หน้าที่:** ดู Log กิจกรรมทั้งระบบ

**ตาราง Database ที่ใช้:**
- `payment_logs` — Transaction การชำระเงิน
- `tbl_redemption_history` — ประวัติแลกรางวัล
- `tbl_coupon_usage` — ประวัติใช้คูปอง

---

## 11. Components ที่ใช้ร่วมกัน

---

### Navbar.jsx
**ไฟล์:** [src/Navbar.jsx](src/Navbar.jsx)

**หน้าที่:** Header ด้านบนของทุกหน้า  
**ตาราง Database:** ไม่มี (ใช้ `useCartCount` hook)

**เนื้อหา:**
- Logo (คลิก → `/`)
- Links: หน้าหลัก, ตลาด, เกม, ช่วยเหลือ
- Cart icon + Badge จำนวนสินค้า (จาก `useCartCount`)
- Profile icon (คลิก → `/profile`)
- Hamburger menu (mobile)

---

### BottomNav.jsx
**ไฟล์:** [src/BottomNav.jsx](src/BottomNav.jsx)

**หน้าที่:** Navigation bar ด้านล่างสำหรับ Mobile  
**ตาราง Database:** ไม่มี

**เนื้อหา:** Home, ตลาด, เกม, ช่วยเหลือ, โปรไฟล์ (เหมือน Navbar แต่เป็น Bottom Bar)

---

### FloatingCart.jsx
**ไฟล์:** [src/FloatingCart.jsx](src/FloatingCart.jsx)

**หน้าที่:** ปุ่มตะกร้าลอยบนหน้าจอ (Floating Action Button)  
**ตาราง Database:** ไม่มี (ใช้ `useCartCount` hook)

**เนื้อหา:**
- ไอคอนตะกร้า + Badge จำนวนสินค้า
- คลิก → ไป `/cart`
- แสดงบนหน้า Shopping pages

---

### Footer.jsx
**ไฟล์:** [src/Footer.jsx](src/Footer.jsx)

**หน้าที่:** Footer ด้านล่างของทุกหน้า  
**ตาราง Database:** ไม่มี (Static)

---

### RealtimeStatsChart.jsx
**ไฟล์:** [src/RealtimeStatsChart.jsx](src/RealtimeStatsChart.jsx)

**หน้าที่:** กราฟแสดงยอดขาย (ใช้ใน EntrepreneurDashboard และ AdminDashboard)  
**ตาราง Database:** `tbl_orders` (ผ่าน API)

**ฟีเจอร์:**
- กราฟ Bar (ยอดขายรายวัน)
- กราฟ Line (รายได้รายเดือน)
- Realtime update ผ่าน Socket.io (รับ event จาก server เมื่อมีออเดอร์ใหม่)

---

### MarketLanding.jsx
**ไฟล์:** [src/MarketLanding.jsx](src/MarketLanding.jsx)

**หน้าที่:** Alternative landing page เน้นตลาด (ไม่มีใน Route หลัก)  
**ตาราง Database:**
- `tbl_floating_markets`
- `tbl_shops`
- `tbl_products`
- `tbl_market_reviews`

---

## 12. API Utilities

---

### api/checkoutCart.js
**ไฟล์:** [src/api/checkoutCart.js](src/api/checkoutCart.js)

**หน้าที่:** Helper functions สำหรับ Checkout

**ฟังก์ชัน:**
- `checkoutCart(cartItems, couponId, paymentMethod)` — สร้างออเดอร์ → `POST /orders/checkout` → คืน `{ order_id, requiresPayment }`
- `createCharge(token, amount, orderId)` — ชำระด้วย Omise → `POST /payments/create-charge`

---

### api/syncCartToBackend.js
**ไฟล์:** [src/api/syncCartToBackend.js](src/api/syncCartToBackend.js)

**หน้าที่:** Sync ตะกร้า localStorage ไป Backend Database

**เรียกใช้เมื่อ:**
- Login สำเร็จ
- เพิ่ม/ลบสินค้าจาก ShopProfile
- อัปเดตจำนวนสินค้า

**API Call:**
- `POST /cart/add` — ส่งรายการทั้งหมดในตะกร้าไปบันทึก

---

## 13. Flow การทำงานสำคัญ

### Flow ซื้อสินค้า
```
Homepage / ShopProductPage
    ↓ เพิ่มลงตะกร้า (localStorage)
Cart.jsx
    ↓ เลือกคูปอง/รางวัล + ตรวจสอบ
    ↓ กดชำระเงิน
    ├── [บัตรเครดิต] → Payment.jsx → Omise Token → /payments/create-charge
    └── [เงินสด] → /orders/checkout ทันที
OrderConfirmation.jsx ← ล้างตะกร้า
```

### Flow สมัครผู้ประกอบการ
```
Profile / Navbar → AddShopForm.jsx
    ↓ POST /add-entrepreneur
    ↓ สถานะ "Pending"
AdminDashboard → EntrepreneurApprovals
    ↓ Admin กด "อนุมัติ"
    ↓ PUT /admin/entrepreneurs/:id/approve
Entrepreneur เข้าถึง EntrepreneurDashboard ได้
```

### Flow ระบบเกม
```
GamePage.jsx → เลือกเกม
    ├── GameQuiz → ตอบ 5 ข้อ → รับคะแนน (1 ครั้ง/วัน)
    ├── GameBuyProduct → ซื้อครบเป้า → รับ Quest reward
    └── GameStepCounter → บันทึกก้าว → แลกเป็นคะแนน
คะแนนสะสมใน tbl_users.points
แลกคะแนน → tbl_rewards → ใช้เป็นส่วนลดใน Cart
```

### Flow Realtime Notification
```
ลูกค้าสั่งซื้อ → /orders/checkout
    ↓ server.js emit socket event "new-order"
EntrepreneurDashboard / RealtimeStatsChart
    ↓ รับ event → อัปเดต UI อัตโนมัติ
```

---

*เอกสารนี้ครอบคลุมไฟล์ทั้งหมด 47 ไฟล์ใน LongLoy Project*
