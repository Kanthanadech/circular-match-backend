# ♻ Circular Match — Backend API

Production-ready REST API for the **Circular Match** waste-to-resource matching platform.  
Built with **Node.js (Express) + TypeScript + PostgreSQL (Prisma ORM)**.

---

## 📁 Project Structure

```
circular-match-backend/
├── prisma/
│   └── schema.prisma          ← Database schema (User, Waste, Match)
├── src/
│   ├── index.ts               ← Express app entry point
│   ├── controllers/
│   │   ├── auth.controller.ts    ← Register / Login / Me
│   │   ├── waste.controller.ts   ← CRUD for waste listings
│   │   ├── match.controller.ts   ← Smart matching + recommendations
│   │   └── report.controller.ts  ← ESG PDF report generation
│   ├── middleware/
│   │   └── auth.middleware.ts    ← JWT verification + role guard
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── waste.routes.ts
│   │   ├── match.routes.ts
│   │   └── report.routes.ts
│   ├── services/
│   │   ├── maps.service.ts       ← Google Distance Matrix API
│   │   └── report.service.ts     ← Puppeteer PDF generation
│   ├── utils/
│   │   ├── prisma.ts             ← Prisma singleton
│   │   └── carbon.ts             ← GHG Protocol carbon calc
│   └── types/
│       └── index.ts              ← Shared TypeScript interfaces
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, GOOGLE_MAPS_API_KEY
```

### 3. Set up the database
```bash
# Make sure PostgreSQL is running, then:
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run in development
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm start
```

---

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ✗ | Register with email, password, address |
| `POST` | `/api/auth/login` | ✗ | Login → returns JWT token |
| `GET`  | `/api/auth/me` | ✓ | Get current user profile |

**Register example:**
```json
POST /api/auth/register
{
  "email": "farm@example.com",
  "password": "securepass123",
  "companyName": "ฟาร์มไส้เดือนสวนเกษตร",
  "role": "RECEIVER",
  "addressText": "บางพลี สมุทรปราการ"
}
```
The `addressText` is automatically geocoded to `lat/lng` via Google Geocoding API.

---

### Wastes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/wastes` | ✗ | List available wastes |
| `GET`  | `/api/wastes/:id` | ✗ | Get single waste |
| `POST` | `/api/wastes` | ✓ GENERATOR | Post a new waste listing |

---

### Smart Matching ⚡ (The Core Feature)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/matches/recommendations` | ✓ RECEIVER | Get sorted recommendations |
| `POST` | `/api/matches` | ✓ RECEIVER | Confirm a match |
| `PATCH`| `/api/matches/:id/status` | ✓ | Update match status |

**Recommendations query params:**
```
GET /api/matches/recommendations?radiusKm=30&category=ORGANIC&limit=10
```

**Response includes:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "กากกาแฟสด",
      "distanceKm": 8.23,
      "durationMins": 15,
      "estimatedCarbonSavedKg": 15.36,
      "matchScore": 87
    }
  ],
  "meta": {
    "algorithm": "Google Distance Matrix + Weighted Score (dist:40% qty:30% co2:20% fresh:10%)"
  }
}
```

---

### ESG Report 📄 (The Killer Feature)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/reports/esg/preview` | ✓ | JSON stats for dashboard |
| `GET`  | `/api/reports/esg/download` | ✓ | **Download PDF report** |

```
GET /api/reports/esg/download?year=2025
Authorization: Bearer <jwt_token>
```
→ Browser saves `ESG_Carbon_Report_CompanyName_2025.pdf`

---

## ⚙️ Architecture Decisions

### Smart Matching Algorithm
```
Score = (distance_score × 0.40)
      + (weight_score   × 0.30)
      + (carbon_score   × 0.20)
      + (freshness_score × 0.10)
```
- **Distance**: uses Google Distance Matrix API (actual driving km), falls back to Haversine if no API key
- Up to 25 destinations per API call (batch chunking built in)

### Carbon Calculation (GHG Protocol Scope 3)
```
landfill_saved  = weight_kg × EF_material
transport_emit  = distance_km × 0.07   # kgCO2e/km (3-ton truck)
net_saved       = landfill_saved - transport_emit
```
Emission Factors: `ORGANIC=0.32` | `WOOD=0.58` | `OIL=1.20` | `PAPER=0.91` | `PLASTIC=0.75`

### PDF Generation (Puppeteer)
1. Query completed matches from DB
2. Build ESGReportData object
3. Render professional HTML template
4. Puppeteer headless Chrome → `.pdf` buffer
5. `Content-Disposition: attachment` header → browser download dialog

---

## 🗄️ Database Schema

```
Users ──< Wastes ──── Matches >── Users
           (generator)              (receiver)
```

- **User**: UUID PK, email (unique), bcrypt hash, role (GENERATOR/RECEIVER/ADMIN), lat/lng
- **Waste**: UUID PK, FK→User, title, category enum, weightKg, status enum
- **Match**: UUID PK, FK→Waste (unique), FK→receiver User, distanceKm, carbonSavedKg, status enum

---

## 🔐 Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens — 7-day expiry, signed with `JWT_SECRET`
- Timing-safe password comparison (prevents user enumeration)
- Role-based middleware (`GENERATOR` / `RECEIVER` / `ADMIN`)
- Input validation with **Zod** on every endpoint

---

## 🌱 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`, `24h`) |
| `GOOGLE_MAPS_API_KEY` | Enables real driving distances + address geocoding |
| `PORT` | Server port (default: 3000) |

> **Without `GOOGLE_MAPS_API_KEY`**: the system automatically falls back to the Haversine formula — fully functional for demo/hackathon use.

---

## 🧪 Test the API (cURL)

```bash
# 1. Register a generator
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"cafe@test.com","password":"pass12345","companyName":"Café Amazon","role":"GENERATOR","lat":13.7563,"lng":100.5018}'

# 2. Post a waste
TOKEN="<paste_token_from_register>"
curl -X POST http://localhost:3000/api/wastes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"กากกาแฟสด","category":"ORGANIC","weightKg":50}'

# 3. Register a receiver & get recommendations
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"farm@test.com","password":"pass12345","companyName":"ฟาร์มไส้เดือน","role":"RECEIVER","lat":13.81,"lng":100.55}'

RTOKEN="<receiver_token>"
curl "http://localhost:3000/api/matches/recommendations?radiusKm=50" \
  -H "Authorization: Bearer $RTOKEN"

# 4. Download ESG Report PDF
curl -o report.pdf \
  "http://localhost:3000/api/reports/esg/download?year=2025" \
  -H "Authorization: Bearer $RTOKEN"
```
