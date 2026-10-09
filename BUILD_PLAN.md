# PNG School Management System - Build Plan

## Overview
Building a full-stack cloud-based multi-tenant school management system with:
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express.js + Prisma ORM
- **Database**: PostgreSQL (schema designed in SDD)
- **Auth**: JWT + Refresh Tokens

## Build Phases

### Phase 1: Project Scaffolding & Configuration
- [ ] Initialize monorepo with Turborepo
- [ ] Set up Next.js frontend (apps/web)
- [ ] Set up Express backend (backend/)
- [ ] Set up shared packages (packages/shared)
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Tailwind CSS with custom theme (colors, typography from SDD)

### Phase 2: Backend Foundation
- [ ] Express app setup with middleware pipeline
- [ ] Prisma schema (all 20+ tables from SDD)
- [ ] Database migrations
- [ ] Auth module (JWT, refresh tokens, login/register)
- [ ] Tenant middleware (multi-tenant resolution)
- [ ] RBAC middleware (role-based access control)
- [ ] Error handling middleware
- [ ] Audit logging middleware

### Phase 3: Backend API Modules
- [ ] Schools module (CRUD)
- [ ] Users module (CRUD)
- [ ] Students module (CRUD, bulk import, transfers)
- [ ] Teachers module (CRUD)
- [ ] Classes & Subjects module
- [ ] Attendance module (mark, batch, reports)
- [ ] Academics module (assessments, exams, marks)
- [ ] Reports module (report cards, GPA calculation)
- [ ] Notifications module
- [ ] Analytics module
- [ ] Fees module

### Phase 4: Frontend Foundation
- [ ] Root layout with providers (Auth, Theme, Query)
- [ ] UI components (shadcn/ui): Button, Card, Input, Table, Modal, etc.
- [ ] Layout components: Sidebar, Topbar, MobileNav
- [ ] Shared components: DataTable, SearchInput, Pagination, etc.
- [ ] Auth pages: Login, Register, Forgot Password
- [ ] Zustand stores: auth-store, theme-store, ui-store
- [ ] API client (Axios instance with interceptors)
- [ ] Custom hooks: useAuth, useStudents, useAttendance, etc.

### Phase 5: Frontend Pages - Dashboard & Students
- [ ] Landing page (hero, features, pricing, testimonials)
- [ ] Dashboard (metric cards, charts, recent activity)
- [ ] Student List (data table, search, filters, pagination)
- [ ] Student Profile (tabs: overview, attendance, academics, documents)

### Phase 6: Frontend Pages - Attendance & Academics
- [ ] Attendance page (grid, bulk actions, date picker)
- [ ] Marks/Grades page (entry table, auto-calculate)
- [ ] Reports page (report cards, analytics, export)

### Phase 7: Frontend Pages - Role-Specific Dashboards
- [ ] Teacher Dashboard (schedule, quick actions, classes)
- [ ] Parent Dashboard (children cards, attendance, grades)
- [ ] Admin Dashboard (analytics, alerts, quick links)
- [ ] Settings page (profile, school, academic, security)

### Phase 8: Polish & Deployment
- [ ] Dark mode support
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Animations (Framer Motion)
- [ ] Loading states, error states, empty states
- [ ] PWA offline support
- [ ] Docker setup
- [ ] CI/CD pipeline

