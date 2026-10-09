# Department of Works & Highways — Materials Testing Laboratory Management System (DOW MS)

A cloud-based, multi-tenant materials testing laboratory information and workflow management system designed for the Department of Works & Highways (PNG) Central Materials Testing Laboratory and regional facilities.

## 🚀 Features

- **Sample Registration & Chain of Custody** - Registration, tagging, QR/barcode identification, assignment, and status tracking
- **Laboratory Worksheets & Calculations** - Standard testing calculations for Soils (MC, Atterberg, PSD, Compaction MDD, CBR), Aggregates, Concrete, Field Testing, and Rock
- **Compliance & Method Standards** - Automated verification against PNG DoW Specifications, AS (Australian Standards), and ASTM standards
- **Multi-Role Workstation Support** - Tailored interfaces for Lab Managers, Senior Materials Engineers, Quality Officers, and Shared Laboratory Workstation Technicians
- **Report & Certificate Generation** - Multi-stage review, digital approvals, certificate numbering, and verification QR codes
- **Audit Logging & Governance** - Comprehensive audit trail across all sensitive test parameter changes and result verifications
- **Multi-Tenant / Facility Scoped** - Facility-level isolation scoped by laboratory facility
- **Cloud-Based & Resilient** - PostgreSQL (Neon) with connection resilience and automated schema migrations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion |
| **State Management** | Zustand, TanStack Query |
| **Backend** | Node.js, Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Auth** | JWT + Refresh Tokens |
| **Caching** | Redis (optional) |

## 📁 Project Structure

```
dow-materials-laboratory-management-system/
├── apps/
│   └── web/                    # Next.js Frontend (@dow-lab/web)
│       └── src/
│           ├── app/            # Next.js App Router (Auth & Dashboard pages)
│           ├── components/     # Laboratory components & worksheets
│           ├── lib/            # Utilities & Axios API client
│           └── stores/         # Zustand stores (Auth, Lab state)
├── backend/                    # Express.js API (@dow-lab/backend)
│   ├── src/
│   │   ├── config/             # DB & Neon IPv4 tunnel config
│   │   ├── middleware/         # Auth & RBAC middleware
│   │   ├── modules/            # Lab modules (auth, samples, tests, reports)
│   │   ├── services/           # Calculation & worksheet engines
│   │   └── utils/              # Token utils, logger, errors
│   └── prisma/                 # Database schema & migrations
└── docs/                       # Specifications & laboratory domain analysis
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/png-school-management-system.git
cd png-school-management-system
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../apps/web
npm install
```

3. **Set up environment variables**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Frontend
cd ../apps/web
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL if needed
```

4. **Run database migrations**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

5. **Start development servers**
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from apps/web directory)
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@png-sms.com | Admin123! |
| School Admin | principal@pomdemo.edu.pg | School123! |
| Teacher | sarah.teaching@pomdemo.edu.pg | Teacher123! |

## Temporary Google Sheets Student Mode

The student list supports two reversible data sources:

- `database` uses the existing backend student API.
- `google_sheets` reads the `Students` sheet through a Google Apps Script web app.

### Configure Google Sheets mode

1. Create a Google Sheet with a tab named `Students`. Use a header row containing `student_id`, `name`, `program`, `year`, `email`, `phone`, and `status`.
2. Open **Extensions > Apps Script**, paste the code from [docs/google-sheets-students.gs](docs/google-sheets-students.gs), and deploy it as a web app. Set **Execute as** to yourself and **Who has access** to the audience that will use the demo.
3. In `apps/web/.env.local`, set:

```env
NEXT_PUBLIC_DATA_SOURCE=google_sheets
NEXT_PUBLIC_GOOGLE_SHEETS_API_URL=YOUR_GOOGLE_APPS_SCRIPT_URL
```

`NEXT_PUBLIC_` is required because the existing Next.js student page loads this data in the browser. The URL is an endpoint, not a database credential. Restart the web app after changing environment variables.

4. The existing student login remains the authentication mechanism. In Google Sheets mode, use a Student ID and password from the sheet. The dashboard requests only the matching student row. Add or edit that row in the sheet, then select **Refresh** to retrieve the latest record. The admin Students page continues to load the full list.

The Apps Script endpoint is a public demo endpoint. Its optional `email` and `student_id` filters reduce normal student requests, but they are not an authorization boundary. Do not place passwords, tokens, database credentials, or other secrets in the sheet. Production use should proxy this request through an authenticated backend endpoint.

### Switch back to the database

Set `NEXT_PUBLIC_DATA_SOURCE=database` and restart or redeploy the web app. No database schema, records, authentication, or backend routes are changed by this demo mode.

## 📚 API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Auth
- `POST /auth/login` - Sign in
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Sign out
- `POST /auth/forgot-password` - Request password reset

### Schools
- `GET /schools` - List schools (super admin)
- `POST /schools` - Create school
- `GET /schools/:id` - Get school details
- `PATCH /schools/:id` - Update school

### Students
- `GET /students` - List students
- `POST /students` - Register student
- `GET /students/:id` - Get student profile
- `PATCH /students/:id` - Update student
- `DELETE /students/:id` - Soft-delete student

### Attendance
- `GET /attendance` - Get attendance records
- `POST /attendance/batch` - Batch mark attendance
- `GET /attendance/student/:id` - Student attendance history

## 🔒 Security

- JWT with short-lived access tokens (15min) and refresh tokens (7 days)
- Passwords hashed with bcrypt (12 salt rounds)
- Row-level tenant isolation via school_id
- Role-based access control (RBAC)
- Rate limiting on auth endpoints
- Audit logging for all CRUD operations

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support, email info@png-sms.com or visit our documentation.
