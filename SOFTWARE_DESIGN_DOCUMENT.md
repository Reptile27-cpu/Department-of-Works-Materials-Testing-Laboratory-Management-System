# 📚 PNG School Management System
## Software Design Document (SDD)
### Version 1.0 — Cloud-Based Multi-Tenant Architecture

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Main Modules](#4-main-modules)
5. [Database Design](#5-database-design)
6. [Technology Stack](#6-technology-stack)
7. [UI/UX Design](#7-uiux-design)
8. [Folder Structure](#8-folder-structure)
9. [Security & Compliance](#9-security--compliance)
10. [Deployment Strategy](#10-deployment-strategy)
11. [Future Features](#11-future-features)
12. [Appendices](#12-appendices)

---

## 1. Project Overview

### 1.1 Purpose

The **PNG School Management System (PNG-SMS)** is a cloud-based, multi-tenant platform designed to digitize student attendance tracking, academic record management, and school administration for primary and secondary schools across Papua New Guinea.

The system enables:
- **Super Admins** to manage the entire platform and onboard schools
- **School Administrators** to manage their institution's operations
- **Teachers** to record attendance, grades, and communicate with parents
- **Parents** to monitor their children's academic progress in real-time
- **Students** to view their schedule, grades, and assignments

### 1.2 Problems It Solves for PNG Schools

| Problem | Solution |
|---------|----------|
| **Manual paper-based records** are lost, damaged, or degraded in PNG's humid tropical climate | Cloud storage with automatic backups ensures data permanence and disaster recovery |
| **No centralized student tracking** when students transfer between provinces | Unified student profiles with transfer history across all schools on the platform |
| **Parents in remote areas** cannot easily check their child's attendance or grades | Mobile-accessible parent portal works on low-bandwidth connections and basic smartphones |
| **Administrative burden** on teachers who spend hours compiling reports | Automated report generation, GPA calculation, and analytics dashboards |
| **Lack of data-driven insights** for education policy makers | Anonymized aggregate analytics for provincial and national education departments |
| **Inconsistent grading standards** across schools | Configurable but standardized grading scales and reporting formats |
| **Late arrival and truancy** not tracked systematically | Real-time attendance tracking with automated notifications to parents |
| **School fees management** handled through cash with no digital trail | Digital fee tracking and payment reconciliation |

### 1.3 Why Cloud-Based > Desktop Software

| Aspect | Desktop Software | Cloud-Based (This System) |
|--------|-----------------|--------------------------|
| **Access** | Single computer only | Any device, anywhere, anytime |
| **Backups** | Manual, often forgotten | Automatic, redundant, geo-replicated |
| **Updates** | Manual installation per machine | Seamless, all users get latest version |
| **Cost** | High upfront licensing + IT support | Predictable subscription, zero infrastructure cost |
| **Scalability** | Requires new hardware for growth | Elastic, scales with demand |
| **Data Security** | Vulnerable to theft, fire, flood | Enterprise-grade security, encryption at rest & transit |
| **Collaboration** | Limited to file sharing | Real-time multi-user concurrent access |
| **Offline capability** | Fully offline, no remote access | Progressive Web App (PWA) with offline sync |
| **Internet dependency** | None required | Works offline with sync when connected |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Web App  │  │ Mobile   │  │  PWA     │  │  Offline-first   │   │
│  │ (Next.js)│  │ (React   │  │ (Web App)│  │  Service Worker  │   │
│  │          │  │  Native) │  │          │  │                  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼──────────────┼──────────────┼────────────────┼─────────────┘
        │              │              │                │
        │              │              │                │
┌───────┼──────────────┼──────────────┼────────────────┼─────────────┐
│       │              │              │                │             │
│  ┌────▼──────────────▼──────────────▼────────────────▼────────┐    │
│  │              API GATEWAY (NGINX / Cloudflare)              │    │
│  │           Rate Limiting · SSL Termination · Routing        │    │
│  └────────────────────────┬───────────────────────────────────┘    │
│                           │                                        │
│  ┌────────────────────────▼───────────────────────────────────┐    │
│  │              APPLICATION LAYER (Node.js / Express)         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │    │
│  │  │ Auth    │ │ School  │ │ Student │ │  Attendance     │  │    │
│  │  │ Service │ │ Service │ │ Service │ │  Service        │  │    │
│  │  ├─────────┤ ├─────────┤ ├─────────┤ ├─────────────────┤  │    │
│  │  │Academic │ │ Report  │ │ Notif.  │ │  Analytics      │  │    │
│  │  │ Service │ │ Service │ │ Service │ │  Service        │  │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │    │
│  └────────────────────────┬───────────────────────────────────┘    │
│                           │                                        │
│  ┌────────────────────────▼───────────────────────────────────┐    │
│  │              DATA LAYER                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │    │
│  │  │ PostgreSQL   │  │    Redis     │  │   S3/Cloudinary │   │    │
│  │  │ (Primary DB) │  │   (Cache)    │  │   (File Store) │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────────┘   │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Tenant Strategy

**Approach: Row-Level Tenant Isolation (with Schema per Tenant optional)**

- **Primary strategy**: All tenants share the same database schema. Every table includes a `school_id` (tenant_id) column.
- **Secondary (premium)**: Option for dedicated schema per school for schools with >5,000 students.
- **Benefits**: Simpler maintenance, shared infrastructure, cheaper per-tenant cost, easy cross-tenant analytics (anonymized).

### 2.3 Data Flow

```
User Action → Client App → API Gateway → Auth Middleware → Tenant Resolution
    → Controller → Service Layer → Database → Response → Client Rendering
```

- **Tenant Resolution**: Extracted from JWT claims or subdomain (`schoolname.pn-sms.com`)
- **Auth Middleware**: Validates JWT, checks permissions, appends `school_id` to request context

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

```
                    ┌─────────────────┐
                    │   SUPER ADMIN    │
                    │  (Platform-Wide) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ SCHOOL ADMIN    │
                    │ (Per School)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼─────┐ ┌─────▼────────┐
     │   TEACHER     │ │  PARENT  │ │   STUDENT    │
     │ (Class-Level) │ │ (Child's │ │ (Self-Service)│
     │               │ │  Data)   │ │              │
     └───────────────┘ └──────────┘ └──────────────┘
```

### 3.2 Permissions Matrix

| Permission | Super Admin | School Admin | Teacher | Parent | Student |
|------------|:-----------:|:------------:|:-------:|:------:|:-------:|
| **Platform Management** | | | | | |
| Manage schools (CRUD) | ✅ | ❌ | ❌ | ❌ | ❌ |
| View platform analytics | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage subscription plans | ✅ | ❌ | ❌ | ❌ | ❌ |
| **School Administration** | | | | | |
| Manage school profile | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage academic year | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage teachers | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage classes/sections | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage subjects | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create timetable | ❌ | ✅ | ✅ | ❌ | ❌ |
| View all school reports | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Student Management** | | | | | |
| Register new students | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit student profile | ❌ | ✅ | ❌ | ❌ | ❌ |
| Transfer students | ❌ | ✅ | ❌ | ❌ | ❌ |
| Graduation processing | ❌ | ✅ | ❌ | ❌ | ❌ |
| View student list | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Attendance** | | | | | |
| Mark daily attendance | ❌ | ✅ | ✅ | ❌ | ❌ |
| View attendance reports | ❌ | ✅ | ✅ | ✅ (own children) | ✅ (self) |
| Edit attendance records | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Academics** | | | | | |
| Create assessments/exams | ❌ | ✅ | ✅ | ❌ | ❌ |
| Enter marks/grades | ❌ | ❌ | ✅ | ❌ | ❌ |
| View marks | ❌ | ✅ | ✅ | ✅ (own children) | ✅ (self) |
| Generate report cards | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Parent/Student Portal** | | | | | |
| View child/own profile | ❌ | ❌ | ❌ | ✅ | ✅ |
| View timetable | ❌ | ❌ | ❌ | ✅ | ✅ |
| Receive notifications | ❌ | ✅ | ✅ | ✅ | ✅ |
| Download reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Submit leave requests | ❌ | ❌ | ❌ | ✅ | ❌ |

### 3.3 User Workflows

#### Super Admin Onboarding a School
```
Login → Dashboard → "Add New School" → Fill school details → 
Configure academic calendar → Assign School Admin → 
Send welcome credentials → School goes live
```

#### School Admin Adding a Teacher
```
Login → School Dashboard → "Teachers" → "Add Teacher" → 
Fill teacher details → Assign subjects → Assign classes → 
System sends login credentials via email/SMS
```

#### Teacher Marking Attendance
```
Login → Teacher Dashboard → "My Classes" → Select Class → 
Select Date → Mark each student: Present / Absent / Late → 
Add remarks → Submit → Real-time notification to parents of absent/late students
```

#### Parent Monitoring Child
```
Login → Parent Dashboard → View all children (even across schools) → 
Select child → View attendance, grades, report cards, announcements
```

---

## 4. Main Modules

### 4.1 Student Management Module

**Capabilities:**
- **Registration**: Digital enrollment form with fields for personal info, guardian details, medical info, previous school, documents upload (birth certificate, photo)
- **Student Profile**: Complete academic history, attendance summary, disciplinary records, documents
- **Student ID Generation**: Auto-generated unique student ID with barcode/QR code format: `PNG-[SCHOOL_CODE]-[YEAR]-[SEQUENTIAL]`
- **Bulk Import**: CSV/Excel bulk student registration
- **Transfers**: Inter-school transfer workflow with data migration, transfer certificate generation
- **Graduation**: Batch graduation processing, certificate generation, alumni status
- **Archiving**: Soft-delete with restore capability for graduated/withdrawn students

**Validation Rules:**
- Unique National ID or Birth Certificate number (if available)
- Mandatory fields: Full Name, DOB, Gender, Grade, Guardian Contact
- Duplicate detection by name + DOB + guardian phone

### 4.2 Attendance Module

**Capabilities:**
- **Daily Attendance**: Mark Present (✅), Absent (❌), Late (⏰), Excused (📝), Holiday (🏖️)
- **Bulk Marking**: Mark all present, then toggle absentees
- **Time Tracking**: Record check-in/check-out times for late arrivals
- **Absence Reasons**: Categorized (Sick, Family Emergency, Travel, Other)
- **Attendance Statistics**: Per student, per class, per grade — daily, weekly, monthly, yearly
- **Reports**: Monthly attendance summary, tardiness report, truancy alert
- **Notifications**: Auto-SMS/Email to parents when child is absent or late
- **QR Code Scanning**: Future — tap QR on student ID to mark attendance

**Attendance Rules:**
- Students marked absent for 3+ consecutive days → auto-notification to School Admin
- Monthly attendance percentage calculated: (Present Days / Total School Days) × 100
- Minimum 80% attendance required for exam eligibility

### 4.3 Academics Module

**Sub-Modules:**

#### Subjects & Classes
- Subject creation with code, name, category (Core/Elective), credit hours
- Class/Section management with capacity, assigned teacher, room
- Subject-teacher-class mapping

#### Assessments & Exams
- **Assessment Types**: Quiz, Test, Mid-Term, Final Exam, Practical, Project, Homework
- **Exam Scheduling**: Date, time, duration, venue, invigilator assignment
- **Grading Scales**: Configurable (A-F, Numeric 1-100, Descriptive)
- **Mark Entry**: Per subject, per student with grade boundary auto-calculation
- **Weighted Scores**: Different weight for each assessment type

#### Report Cards
- **Template System**: Multiple report card templates (per school)
- **Auto-Generation**: Combine all term marks, calculate averages, generate PDF
- **Components**: Student info, subject-wise marks, grades, GPA, class rank, teacher comments, attendance summary
- **Digital Distribution**: Available in parent/student portal, downloadable PDF

#### GPA Calculation Formula
```
GPA = Σ (Grade Points × Credit Hours) / Σ Total Credit Hours

Grade Scale:
A+ = 4.0 (90-100%)  |  A  = 3.7 (85-89%)
A- = 3.3 (80-84%)   |  B+ = 3.0 (75-79%)
B  = 2.7 (70-74%)   |  B- = 2.3 (65-69%)
C+ = 2.0 (60-64%)   |  C  = 1.7 (55-59%)
C- = 1.3 (50-54%)   |  D  = 1.0 (40-49%)
F  = 0.0 (Below 40%)
```

### 4.4 Parent Portal Module

**Capabilities:**
- **Dashboard**: Overview of all children, recent activity, notifications
- **Multi-School Support**: One parent account can link to children in different schools
- **Attendance View**: Daily, weekly, monthly attendance with visual charts
- **Grade View**: Real-time marks, assignment scores, exam results
- **Report Cards**: View and download PDF report cards for all terms
- **Timetable**: View child's class schedule
- **Notifications**: Real-time push/email for absences, low grades, events
- **Leave Requests**: Submit absence requests for planned leave
- **Fee Status**: View fee balance and payment history
- **Communication**: Send messages to teachers/administration

### 4.5 Teacher Portal Module

**Capabilities:**
- **Dashboard**: Today's classes, pending tasks, recent activity
- **Attendance**: Mark attendance for assigned classes with one-click interface
- **Grade Management**: Enter/edit marks, calculate averages, add comments
- **Homework**: Assign homework with due dates, attachments, descriptions
- **Announcements**: Post class-level or school-level announcements
- **Timetable**: View personal teaching schedule
- **Student Profiles**: View student details, contact info (with privacy controls)
- **Reports**: Generate class performance reports, attendance summaries
- **Leave Management**: Apply for leave, view leave balance

### 4.6 School Administration Module

**Capabilities:**
- **Teacher Management**: Hire, assign subjects/classes, track attendance, manage leave
- **Class Management**: Create/merge/archive classes, assign rooms and teachers
- **Timetable Builder**: Visual drag-and-drop timetable generation with conflict detection
- **School Calendar**: Academic events, holidays, exam dates, parent-teacher meetings
- **Academic Year Management**: Set terms, holidays, exam periods
- **Reports Hub**: Generate any school report (attendance, academic, staff, enrollment)
- **Settings**: School profile, grading system, notification preferences, branding

### 4.7 Notifications Module

**Capabilities:**
- **Channels**: In-app notifications, Push (web/mobile), Email, SMS (via Twilio)
- **Event Types**:
  - Attendance: Absent alert, Late arrival alert
  - Academics: New grade posted, Report card available, Low performance warning
  - Administrative: Fee due reminder, Holiday announcement, Event reminder
  - System: Password change, New login, Account created
- **Preferences**: Per-user notification channel preferences
- **Templates**: Editable email/SMS templates per school
- **Batching**: Daily digest option for non-urgent notifications

### 4.8 Analytics Dashboard Module

**Capabilities:**
- **Attendance Trends**: Charts showing attendance % over time, by class, by grade
- **Student Performance**: Grade distribution, subject performance, trend analysis
- **Top Performers**: Leaderboard by GPA, subject mastery, improvement
- **At-Risk Students**: Algorithm identifies students below threshold in attendance or grades
- **School Statistics**: Enrollment numbers, teacher-student ratio, class sizes
- **Comparative Reports**: Class vs class, term vs term, year vs year
- **Export**: PDF/Excel/CSV export of all analytics views
- **Super Admin View**: Cross-school aggregated stats (anonymized)

---

## 5. Database Design

### 5.1 Entity Relationship Diagram (Text)

```
schools ──┬── users
          ├── students ──┬── attendance
          │               ├── marks
          │               ├── student_parents ── parents
          │               ├── submissions
          │               └── fee_records
          ├── teachers ──┬── teacher_subjects
          │               └── teacher_classes
          ├── classes ──┬── student_classes
          │               └── timetable_entries
          ├── subjects
          ├── exams ──┬── exam_subjects ──┬── marks
          │           │                    └── grade_boundaries
          │           └── exam_schedules
          ├── assessments
          ├── report_cards
          ├── notifications
          ├── academic_years
          ├── terms
          └── timetable_slots
```

### 5.2 Complete Table Definitions

#### Table: `schools`
```sql
CREATE TABLE schools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "PNG-POM-001"
    address         TEXT,
    province        VARCHAR(100),
    district        VARCHAR(100),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    website         VARCHAR(255),
    logo_url        TEXT,
    school_type     VARCHAR(50) CHECK (school_type IN ('primary', 'secondary', 'combined')),
    accreditation   VARCHAR(100),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_active       BOOLEAN DEFAULT true,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_province ON schools(province);
```

#### Table: `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'parent', 'student')),
    is_active       BOOLEAN DEFAULT true,
    email_verified  BOOLEAN DEFAULT false,
    last_login      TIMESTAMPTZ,
    preferences     JSONB DEFAULT '{}',
    refresh_token   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- For super admin, school_id is NULL
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_users_role ON users(role) WHERE role = 'super_admin';
```

#### Table: `students`
```sql
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    student_id      VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "PNG-POM-001-2024-0001"
    first_name      VARCHAR(100) NOT NULL,
    middle_name     VARCHAR(100),
    last_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    nationality     VARCHAR(100) DEFAULT 'Papua New Guinean',
    birth_cert_no   VARCHAR(100),
    national_id_no  VARCHAR(100),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    medical_info    TEXT,
    blood_group     VARCHAR(5),
    allergies       TEXT,
    profile_photo   TEXT,
    enrollment_date DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'withdrawn')),
    academic_year_id UUID REFERENCES academic_years(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_status ON students(school_id, status);
CREATE INDEX idx_students_id ON students(student_id);
```

#### Table: `parents`
```sql
CREATE TABLE parents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    occupation      VARCHAR(100),
    relationship    VARCHAR(50),  -- 'father', 'mother', 'guardian', 'other'
    is_primary      BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `student_parents`
```sql
CREATE TABLE student_parents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id       UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship    VARCHAR(50),
    is_emergency_contact BOOLEAN DEFAULT false,
    can_pickup      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, parent_id)
);

CREATE INDEX idx_student_parents_student ON student_parents(student_id);
CREATE INDEX idx_student_parents_parent ON student_parents(parent_id);
```

#### Table: `teachers`
```sql
CREATE TABLE teachers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id     VARCHAR(50) UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE,
    gender          VARCHAR(10),
    qualification   VARCHAR(255),
    specialization  VARCHAR(255),
    date_hired      DATE,
    phone           VARCHAR(50),
    address         TEXT,
    is_class_teacher BOOLEAN DEFAULT false,
    class_teacher_of UUID REFERENCES classes(id),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'resigned', 'terminated')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teachers_school ON teachers(school_id);
```

#### Table: `classes`
```sql
CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,  -- e.g., "Grade 10A"
    grade           VARCHAR(50) NOT NULL,   -- e.g., "Grade 10"
    section         VARCHAR(50),            -- e.g., "A", "B"
    academic_year_id UUID REFERENCES academic_years(id),
    class_teacher_id UUID REFERENCES teachers(id),
    room_number     VARCHAR(50),
    capacity        INTEGER DEFAULT 40,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name, academic_year_id)
);

CREATE INDEX idx_classes_school ON classes(school_id);
```

#### Table: `student_classes`
```sql
CREATE TABLE student_classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    term_id         UUID REFERENCES terms(id),
    enrolled_date   DATE DEFAULT CURRENT_DATE,
    UNIQUE(student_id, class_id, academic_year_id)
);

CREATE INDEX idx_student_classes_student ON student_classes(student_id);
CREATE INDEX idx_student_classes_class ON student_classes(class_id);
```

#### Table: `subjects`
```sql
CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),  -- e.g., "MATH101"
    category        VARCHAR(50) CHECK (category IN ('core', 'elective', 'compulsory')),
    credit_hours    INTEGER DEFAULT 1,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, code)
);

CREATE INDEX idx_subjects_school ON subjects(school_id);
```

#### Table: `teacher_subjects`
```sql
CREATE TABLE teacher_subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    UNIQUE(teacher_id, subject_id, class_id, academic_year_id)
);
```

#### Table: `attendance`
```sql
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        UUID REFERENCES classes(id),
    date            DATE NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'holiday')),
    check_in_time   TIME,
    check_out_time  TIME,
    late_minutes    INTEGER DEFAULT 0,
    reason          TEXT,
    remarks         TEXT,
    marked_by       UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_date ON attendance(school_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);
```

#### Table: `assessments`
```sql
CREATE TABLE assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id        UUID REFERENCES classes(id),
    subject_id      UUID REFERENCES subjects(id),
    name            VARCHAR(255) NOT NULL,  -- "Quiz 1", "Mid-Term Exam"
    type            VARCHAR(50) CHECK (type IN ('quiz', 'test', 'midterm', 'final', 'project', 'homework', 'practical')),
    max_score       DECIMAL(10,2) NOT NULL,
    weight          DECIMAL(5,2) DEFAULT 0,  -- percentage weight for final grade
    date            DATE,
    term_id         UUID REFERENCES terms(id),
    academic_year_id UUID REFERENCES academic_years(id),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessments_class ON assessments(class_id, subject_id);
```

#### Table: `exams`
```sql
CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,  -- "Term 1 Final Exams 2024"
    type            VARCHAR(50) CHECK (type IN ('term', 'mid_year', 'final_year', 'mock')),
    term_id         UUID REFERENCES terms(id),
    academic_year_id UUID REFERENCES academic_years(id),
    start_date      DATE,
    end_date        DATE,
    is_published    BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `exam_subjects`
```sql
CREATE TABLE exam_subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    class_id        UUID REFERENCES classes(id),
    date            DATE,
    start_time      TIME,
    end_time        TIME,
    max_score       DECIMAL(10,2),
    pass_score      DECIMAL(10,2),
    invigilator_id  UUID REFERENCES teachers(id),
    venue           VARCHAR(255)
);
```

#### Table: `marks`
```sql
CREATE TABLE marks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id),
    assessment_id   UUID REFERENCES assessments(id) ON DELETE CASCADE,
    exam_subject_id UUID REFERENCES exam_subjects(id) ON DELETE CASCADE,
    score           DECIMAL(10,2) NOT NULL,
    max_score       DECIMAL(10,2),
    grade           VARCHAR(5),
    grade_point     DECIMAL(3,2),
    remarks         TEXT,
    graded_by       UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (assessment_id IS NOT NULL AND exam_subject_id IS NULL) OR
        (assessment_id IS NULL AND exam_subject_id IS NOT NULL)
    )
);

CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_assessment ON marks(assessment_id);
CREATE INDEX idx_marks_subject ON marks(student_id, subject_id);
```

#### Table: `grade_boundaries`
```sql
CREATE TABLE grade_boundaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade           VARCHAR(5) NOT NULL,   -- "A", "B+", etc.
    grade_point     DECIMAL(3,2) NOT NULL, -- 4.0, 3.7, etc.
    min_percentage  DECIMAL(5,2) NOT NULL,
    max_percentage  DECIMAL(5,2) NOT NULL,
    description     VARCHAR(100),
    UNIQUE(school_id, grade)
);
```

#### Table: `report_cards`
```sql
CREATE TABLE report_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id         UUID REFERENCES terms(id),
    academic_year_id UUID REFERENCES academic_years(id),
    total_marks     DECIMAL(10,2),
    total_credits   INTEGER,
    gpa             DECIMAL(3,2),
    class_rank      INTEGER,
    class_size      INTEGER,
    attendance_percentage DECIMAL(5,2),
    teacher_remarks TEXT,
    principal_remarks TEXT,
    pdf_url         TEXT,
    is_published    BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, term_id, academic_year_id)
);

CREATE INDEX idx_report_cards_student ON report_cards(student_id);
```

#### Table: `notifications`
```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id),
    sender_id       UUID REFERENCES users(id),
    recipient_id    UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(50) NOT NULL CHECK (type IN (
                        'attendance_alert', 'grade_posted', 'report_available',
                        'fee_reminder', 'event', 'announcement', 'system',
                        'leave_request', 'low_performance', 'exam_schedule'
                    )),
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    channel         VARCHAR(20) CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
    is_read         BOOLEAN DEFAULT false,
    is_sent         BOOLEAN DEFAULT false,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

#### Table: `roles`
```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id),  -- NULL for system-wide roles
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- Seed default roles
INSERT INTO roles (name, description, is_system) VALUES
('super_admin', 'Platform-wide super administrator', true),
('school_admin', 'School-level administrator', true),
('teacher', 'Classroom teacher', true),
('parent', 'Student parent or guardian', true),
('student', 'Enrolled student', true);
```

#### Table: `permissions`
```sql
CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource        VARCHAR(100) NOT NULL,  -- e.g., 'students', 'attendance', 'marks'
    action          VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    conditions      JSONB,                   -- e.g., {"own_class_only": true}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, resource, action)
);
```

#### Table: `academic_years`
```sql
CREATE TABLE academic_years (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,  -- "2024 Academic Year"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_current      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);
```

#### Table: `terms`
```sql
CREATE TABLE terms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    name            VARCHAR(100) NOT NULL,  -- "Term 1", "Term 2"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_current      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, academic_year_id, name)
);
```

#### Table: `timetable_entries`
```sql
CREATE TABLE timetable_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    teacher_id      UUID REFERENCES teachers(id),
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=Monday
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room_number     VARCHAR(50),
    academic_year_id UUID REFERENCES academic_years(id),
    term_id         UUID REFERENCES terms(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, start_time, room_number)
);

CREATE INDEX idx_timetable_class ON timetable_entries(class_id, day_of_week);
CREATE INDEX idx_timetable_teacher ON timetable_entries(teacher_id, day_of_week);
```

#### Table: `fee_records`
```sql
CREATE TABLE fee_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_type            VARCHAR(100) NOT NULL,  -- "Tuition", "Lab Fee", "Sports Fee"
    amount              DECIMAL(12,2) NOT NULL,
    amount_paid         DECIMAL(12,2) DEFAULT 0,
    balance             DECIMAL(12,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
    due_date            DATE,
    term_id             UUID REFERENCES terms(id),
    academic_year_id    UUID REFERENCES academic_years(id),
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_records_student ON fee_records(student_id);
CREATE INDEX idx_fee_records_status ON fee_records(status);
```

#### Table: `payments` (for future payment gateway integration)
```sql
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    fee_record_id       UUID REFERENCES fee_records(id),
    student_id          UUID NOT NULL REFERENCES students(id),
    amount              DECIMAL(12,2) NOT NULL,
    payment_method      VARCHAR(50),  -- 'cash', 'bank_transfer', 'mobile_money', 'card'
    transaction_ref     VARCHAR(255),
    payment_date        TIMESTAMPTZ DEFAULT NOW(),
    receipt_number      VARCHAR(100),
    received_by         UUID REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `audit_logs`
```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID REFERENCES schools(id),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'login', 'export'
    entity_type     VARCHAR(100),  -- 'student', 'attendance', 'marks'
    entity_id       UUID,
    changes         JSONB,          -- old_values, new_values
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school ON audit_logs(school_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## 6. Technology Stack

### 6.1 Recommended Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend Framework** | Next.js 14 (App Router) | SSR for SEO, React Server Components, file-based routing, excellent DX |
| **UI Library** | React 18 | Industry standard, massive ecosystem |
| **Styling** | Tailwind CSS v3 | Utility-first, responsive, customizable, dark mode support |
| **Component Library** | shadcn/ui + Radix UI | Beautiful, accessible, copy-paste components built on Tailwind |
| **State Management** | Zustand | Lightweight, TypeScript-first, simpler than Redux |
| **Server State** | TanStack Query (React Query) | Caching, pagination, optimistic updates |
| **Form Handling** | React Hook Form + Zod | Performant forms with schema validation |
| **Charts** | Recharts / Tremor | Modern, responsive, accessible charts |
| **Animation** | Framer Motion | Smooth animations, layout animations |
| **Backend** | Node.js + Express.js | JavaScript full-stack, massive ecosystem, serverless-ready |
| **API Design** | RESTful + GraphQL (optional) | REST for CRUD, GraphQL for complex dashboard queries |
| **ORM** | Prisma | Type-safe, auto-generated types, migrations |
| **Database** | PostgreSQL 16 | ACID compliant, JSON support, excellent for relational data |
| **Caching** | Redis (Upstash) | Session store, rate limiting, query caching |
| **Auth** | JWT + Refresh Tokens + NextAuth.js | Stateless, scalable, refresh token rotation |
| **File Storage** | Cloudinary | Image optimization, CDN, transformations |
| **Email** | Resend / SendGrid | Transactional emails, high deliverability |
| **SMS** | Twilio | SMS notifications for PNG parents |
| **Payments** | Stripe / Midtrans | Future fee collection |
| **Hosting** | Vercel (Frontend) + Railway (Backend + DB) | Excellent DX, auto-scaling, global CDN |
| **Monitoring** | Sentry + Logtail | Error tracking, performance monitoring |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

### 6.2 Why PostgreSQL

- **JSONB columns**: Flexible settings, preferences, and metadata without schema changes
- **Row-Level Security**: Future tenant isolation at database level
- **Full-Text Search**: Search students, subjects without external search service
- **ACID Compliance**: Guaranteed data integrity for financial records
- **Maturity**: Excellent tooling, backups, replication
- **Hosted Options**: Supabase, Neon, Railway, AWS RDS

### 6.3 Why Next.js + Express (not Next.js API routes)

| Concern | Next.js API Routes | Separate Express Backend |
|---------|-------------------|-------------------------|
| Long-running tasks | 10s timeout limit | No timeout limit |
| WebSocket support | Limited | Full support |
| Background jobs | Not suitable | Bull/BullMQ queues |
| File processing | Memory constrained | Memory configurable |
| Database connection pooling | Lambda cold starts | Persistent connections |
| Multi-tenant middleware | More complex | Clean middleware pipeline |

---

## 7. UI/UX Design

### 7.1 Design Philosophy

**Inspired by**: Notion (clean typography), Stripe (generous whitespace), Linear (smooth animations)

**Design Principles:**
1. **Clarity over complexity** — Each screen has one primary action
2. **Mobile-first** — Many PNG users access via smartphone
3. **Low bandwidth friendly** — Lazy loading, optimized images, PWA offline support
4. **Accessible** — WCAG 2.1 AA compliance, screen reader support
5. **Consistent** — Design system with reusable components

### 7.2 Color Palette

```css
/* Light Mode */
--bg-primary: #FFFFFF
--bg-secondary: #F6F8FA
--bg-card: #FFFFFF
--text-primary: #0F172A
--text-secondary: #475569
--text-muted: #94A3B8
--accent-primary: #3B82F6      /* Blue */
--accent-success: #10B981      /* Green */
--accent-warning: #F59E0B      /* Amber */
--accent-danger: #EF4444       /* Red */
--border: #E2E8F0
--shadow: 0 1px 3px rgba(0,0,0,0.08)

/* Dark Mode */
--bg-primary: #0F172A
--bg-secondary: #1E293B
--bg-card: #1E293B
--text-primary: #F1F5F9
--text-secondary: #94A3B8
--text-muted: #64748B
--accent-primary: #60A5FA
--accent-success: #34D399
--accent-warning: #FBBF24
--accent-danger: #F87171
--border: #334155
--shadow: 0 1px 3px rgba(0,0,0,0.3)
```

### 7.3 Typography

```css
--font-family: 'Inter', system-ui, -apple-system, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace

--font-size-xs: 0.75rem   (12px)
--font-size-sm: 0.875rem  (14px)
--font-size-base: 1rem    (16px)
--font-size-lg: 1.125rem  (18px)
--font-size-xl: 1.25rem   (20px)
--font-size-2xl: 1.5rem   (24px)
--font-size-3xl: 1.875rem (30px)
--font-size-4xl: 2.25rem  (36px)
```

### 7.4 Component Patterns

**Cards** — Rounded-xl (12px), subtle shadow, white/light bg, hover lift animation
**Buttons** — Rounded-lg (8px), clear hierarchy: Primary (filled), Secondary (outlined), Ghost (no border)
**Inputs** — Rounded-lg, focus ring with accent color, clear labels, error states with icon
**Tables** — Striped rows, sticky header, sorting, filtering, pagination
**Modals** — Centered, backdrop blur, slide-up animation, close on ESC
**Sidebars** — Collapsible, nested navigation with icons, active state indicator
**Toasts** — Slide-in from top-right, auto-dismiss, success/error/warning variants

### 7.5 Page Descriptions

#### 1. Landing Page (`/`)
- **Header**: Logo, navigation links (Features, Pricing, About, Contact), "Get Started" CTA button
- **Hero Section**: Animated gradient background, tagline "Digitizing PNG Education", subtext, CTA buttons
- **Features Grid**: 3-column grid of feature cards with icons and descriptions
- **Stats Section**: Animated counters showing schools, students, teachers on platform
- **How It Works**: 3-step visual flow (Register School → Set Up → Start Using)
- **Testimonials**: Carousel of school administrator quotes
- **Pricing**: 3-tier pricing cards (Free, Pro, Enterprise) with feature comparison
- **Footer**: Links, contact info, social icons, copyright

#### 2. Login Page (`/login`)
- **Layout**: Split screen — left side has illustration/gradient, right side has form
- **Form**: Email input, Password input, "Remember me" checkbox, "Forgot Password?" link, "Sign In" button
- **SSO Options**: "Continue with Google" button (for admins)
- **Role Selector**: Optional dropdown showing which role they're logging in as
- **Footer**: "Don't have an account? Contact your school administrator"

#### 3. Dashboard (`/dashboard`)
- **Layout**: Sidebar (collapsible) + Top bar (search, notifications bell, user avatar dropdown) + Main content
- **Sidebar Navigation**: Dashboard (home icon), Students, Attendance, Academics, Reports, Analytics, Settings
- **Top Cards Row**: 4 metric cards — Total Students, Today's Attendance %, Pending Tasks, Notifications
- **Charts Section**: Attendance trend line chart, Grade distribution bar chart
- **Recent Activity**: Timeline of recent actions (student registered, attendance marked, etc.)
- **Quick Actions**: Floating button or row of action buttons (Mark Attendance, Add Student, etc.)
- **Dark/Light Toggle**: Sun/moon icon in top bar

#### 4. Student List (`/students`)
- **Header**: Title "Students", search bar, filter dropdowns (class, status), "Add Student" button
- **Data Table**: Columns — Student ID, Photo, Full Name, Class, Status, Actions (View, Edit, More)
- **Bulk Actions**: Select multiple students → Bulk assign class, transfer, graduate
- **Pagination**: 25/50/100 per page, page numbers
- **Row Expansion**: Click row to expand inline details (parents, attendance %, GPA)
- **Export**: CSV/Excel export button

#### 5. Student Profile (`/students/[id]`)
- **Header**: Student photo, name, ID, status badge, action buttons (Edit, Transfer, Graduate)
- **Tabs**: Overview, Attendance, Academics, Documents, Fee History
- **Overview Tab**: Personal info card, parent/guardian info card, medical info card
- **Attendance Tab**: Monthly calendar heat map, statistics card, detailed table
- **Academics Tab**: Term-wise GPA timeline, subject-wise marks table, report cards list
- **Documents Tab**: Uploaded documents grid with download links

#### 6. Attendance Page (`/attendance`)
- **Header**: "Attendance", date picker, class selector, subject selector
- **Attendance Grid**: Students listed with status buttons (Present/Absent/Late/Excuse)
- **Bulk Actions**: "Mark All Present" button, then toggle individual changes
- **Summary Card**: Today's statistics — Total, Present, Absent, Late, %
- **History Tab**: List view or calendar view of past attendance records
- **Reports Tab**: Monthly report generation, export to PDF/Excel

#### 7. Marks/Grades Page (`/academics/marks`)
- **Header**: "Marks Entry", class/subject/assessment selectors
- **Entry Table**: Student rows with score input fields, auto-calculated grade, color coding (green ≥75, yellow 50-74, red <50)
- **Bulk Past**: Paste scores from Excel
- **Grade Boundaries**: Side panel showing current grade scale
- **Statistics Row**: Class average, highest, lowest, pass percentage
- **Save**: Auto-save with manual "Publish" button

#### 8. Reports Page (`/reports`)
- **Header**: "Reports", type selector (Attendance, Academic, Combined)
- **Report Cards Tab**: Generate for single student, class, or entire grade
- **Templates**: Choose report card template, preview before generation
- **Analytics Tab**: Pre-built reports with export options
- **Scheduled Reports**: Generate and email reports on schedule
- **Historical**: Access previous term/year reports

#### 9. Parent Dashboard (`/parent/dashboard`)
- **Header**: "Welcome, [Parent Name]", school selector if multiple children across schools
- **Children Cards**: Each child in a card showing photo, name, school, grade, attendance %, latest GPA
- **Click Child**: Expands to show detailed view of that child
- **Child Dashboard**: Attendance gauge, grade summary, recent announcements, timetable
- **Notifications Panel**: Recent alerts about child's attendance and grades
- **Quick Actions**: View report card, contact teacher, submit leave request

#### 10. Teacher Dashboard (`/teacher/dashboard`)
- **Header**: "Welcome, [Teacher Name]", today's date
- **Today's Schedule**: Timeline of today's classes with time, subject, class name
- **Quick Actions**: "Mark Attendance" (first class today), "Enter Grades" (pending tasks)
- **My Classes**: Grid of class cards showing subject, class, student count, pending tasks
- **Recent Activity**: Latest attendance and grade entries
- **Notifications**: School announcements, meeting reminders

#### 11. Admin Dashboard (`/admin/dashboard`)
- **Header**: "School Admin Dashboard", school name, academic year selector
- **Analytics Cards**: Total Students, Total Teachers, Attendance Rate, Average GPA
- **Charts Row**: Enrollment trend (bar), attendance by grade (pie), performance distribution (histogram)
- **Alerts Section**: Low attendance students, pending approvals, overdue fees
- **Recent Activity**: Full audit trail of all school actions
- **Quick Links**: Manage Teachers, Manage Classes, Generate Reports, School Settings

#### 12. Settings (`/settings`)
- **Layout**: Settings sidebar (Profile, School, Academic, Notifications, Security, Billing)
- **Profile Tab**: Edit name, email, phone, avatar, password change
- **School Tab**: School name, address, logo upload, contact info, branding
- **Academic Tab**: Academic year management, term dates, grading scale configuration
- **Notifications Tab**: Configure which notifications to receive and via which channels
- **Security Tab**: Two-factor auth setup, active sessions, login history
- **Billing Tab**: Subscription plan, payment method, invoice history (schools)

### 7.6 Responsive Breakpoints

```css
--sm: 640px    (Mobile landscape)
--md: 768px    (Tablet)
--lg: 1024px   (Desktop)
--xl: 1280px   (Large Desktop)
--2xl: 1536px  (Ultrawide)
```

- **Mobile**: Single column, bottom navigation bar, collapsible sidebar, stacked cards
- **Tablet**: Two-column layout, sidebar icons only, horizontal card layout
- **Desktop**: Full sidebar, multi-column layouts, side-by-side data tables

### 7.7 Animations

- **Page Transitions**: Fade + slide up (150ms ease-out)
- **Card Hover**: Scale 1.02 + shadow increase (200ms ease)
- **Modal Open**: Backdrop fade in + modal slide up (200ms)
- **Notification**: Slide in from right (300ms spring)
- **Sidebar**: Smooth width transition (200ms ease)
- **Loading**: Skeleton shimmer (1.5s infinite loop)
- **Data Refresh**: Gentle pulse on updated elements

---

## 8. Folder Structure

```
png-school-management-system/
│
├── apps/
│   ├── web/                              # Next.js Web Application
│   │   ├── public/
│   │   │   ├── images/
│   │   │   │   ├── logo.svg
│   │   │   │   ├── favicon.ico
│   │   │   │   ├── og-image.png
│   │   │   │   └── illustrations/
│   │   │   └── manifest.json
│   │   │
│   │   ├── src/
│   │   │   ├── app/                      # Next.js App Router
│   │   │   │   ├── (landing)/            # Landing page route group
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── pricing/
│   │   │   │   │   ├── about/
│   │   │   │   │   └── contact/
│   │   │   │   │
│   │   │   │   ├── (auth)/               # Auth route group
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   └── reset-password/
│   │   │   │   │
│   │   │   │   ├── (dashboard)/          # Dashboard route group
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── students/
│   │   │   │   │   ├── attendance/
│   │   │   │   │   ├── academics/
│   │   │   │   │   ├── reports/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── notifications/
│   │   │   │   │
│   │   │   │   ├── admin/                # Admin-specific routes
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── teachers/
│   │   │   │   │   ├── classes/
│   │   │   │   │   ├── subjects/
│   │   │   │   │   ├── timetable/
│   │   │   │   │   └── school-settings/
│   │   │   │   │
│   │   │   │   ├── teacher/              # Teacher-specific routes
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── attendance/
│   │   │   │   │   ├── grades/
│   │   │   │   │   ├── homework/
│   │   │   │   │   └── announcements/
│   │   │   │   │
│   │   │   │   ├── parent/               # Parent-specific routes
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── children/
│   │   │   │   │   ├── attendance/
│   │   │   │   │   ├── grades/
│   │   │   │   │   └── leave-requests/
│   │   │   │   │
│   │   │   │   └── layout.tsx            # Root layout
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # shadcn/ui components
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── modal.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   ├── toast.tsx
│   │   │   │   │   ├── tabs.tsx
│   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── layout/               # Layout components
│   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   ├── topbar.tsx
│   │   │   │   │   ├── mobile-nav.tsx
│   │   │   │   │   └── page-container.tsx
│   │   │   │   │
│   │   │   │   ├── shared/               # Shared feature components
│   │   │   │   │   ├── metric-card.tsx
│   │   │   │   │   ├── data-table.tsx
│   │   │   │   │   ├── search-input.tsx
│   │   │   │   │   ├── filter-dropdown.tsx
│   │   │   │   │   ├── pagination.tsx
│   │   │   │   │   ├── empty-state.tsx
│   │   │   │   │   ├── loading-state.tsx
│   │   │   │   │   ├── error-state.tsx
│   │   │   │   │   ├── confirm-dialog.tsx
│   │   │   │   │   └── file-upload.tsx
│   │   │   │   │
│   │   │   │   ├── charts/               # Chart components
│   │   │   │   │   ├── line-chart.tsx
│   │   │   │   │   ├── bar-chart.tsx
│   │   │   │   │   ├── pie-chart.tsx
│   │   │   │   │   ├── heat-map.tsx
│   │   │   │   │   └── dashboard-charts.tsx
│   │   │   │   │
│   │   │   │   └── forms/                # Form components
│   │   │   │       ├── student-form.tsx
│   │   │   │       ├── teacher-form.tsx
│   │   │   │       ├── class-form.tsx
│   │   │   │       ├── attendance-form.tsx
│   │   │   │       └── marks-form.tsx
│   │   │   │
│   │   │   ├── hooks/                    # Custom React hooks
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-students.ts
│   │   │   │   ├── use-attendance.ts
│   │   │   │   ├── use-marks.ts
│   │   │   │   ├── use-notifications.ts
│   │   │   │   ├── use-debounce.ts
│   │   │   │   └── use-media-query.ts
│   │   │   │
│   │   │   ├── lib/                      # Utility libraries
│   │   │   │   ├── api.ts                # API client (Axios instance)
│   │   │   │   ├── auth.ts               # Auth helpers
│   │   │   │   ├── utils.ts              # General utilities
│   │   │   │   ├── validations.ts        # Zod schemas
│   │   │   │   └── constants.ts          # App constants
│   │   │   │
│   │   │   ├── stores/                   # Zustand stores
│   │   │   │   ├── auth-store.ts
│   │   │   │   ├── theme-store.ts
│   │   │   │   └── ui-store.ts
│   │   │   │
│   │   │   └── types/                    # TypeScript type definitions
│   │   │       ├── api.ts
│   │   │       ├── models.ts
│   │   │       ├── auth.ts
│   │   │       └── common.ts
│   │   │
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .env.local
│   │
│   └── mobile/                           # React Native Mobile App (Future)
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── navigation/
│       │   └── services/
│       ├── package.json
│       └── app.json
│
├── packages/                             # Shared packages
│   ├── shared/                           # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   ├── validators/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                               # Shared UI components (future design system)
│       ├── src/
│       │   ├── components/
│       │   └── styles/
│       ├── package.json
│       └── tsconfig.json
│
├── backend/                              # Express.js Backend API
│   ├── src/
│   │   ├── index.ts                      # Entry point
│   │   ├── app.ts                        # Express app setup
│   │   │
│   │   ├── config/
│   │   │   ├── database.ts               # Prisma/DB connection
│   │   │   ├── redis.ts                  # Redis connection
│   │   │   ├── env.ts                    # Environment variables
│   │   │   └── cors.ts                   # CORS configuration
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts         # JWT verification
│   │   │   ├── tenant.middleware.ts       # Tenant resolution
│   │   │   ├── rbac.middleware.ts         # Role-based access control
│   │   │   ├── validate.middleware.ts     # Request validation
│   │   │   ├── rate-limit.middleware.ts   # Rate limiting
│   │   │   ├── audit.middleware.ts        # Audit logging
│   │   │   └── error.middleware.ts        # Global error handler
│   │   │
│   │   ├── modules/                      # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.validation.ts
│   │   │   │   └── auth.utils.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   └── user.validation.ts
│   │   │   │
│   │   │   ├── schools/
│   │   │   │   ├── school.controller.ts
│   │   │   │   ├── school.service.ts
│   │   │   │   ├── school.routes.ts
│   │   │   │   └── school.validation.ts
│   │   │   │
│   │   │   ├── students/
│   │   │   │   ├── student.controller.ts
│   │   │   │   ├── student.service.ts
│   │   │   │   ├── student.routes.ts
│   │   │   │   └── student.validation.ts
│   │   │   │
│   │   │   ├── attendance/
│   │   │   │   ├── attendance.controller.ts
│   │   │   │   ├── attendance.service.ts
│   │   │   │   ├── attendance.routes.ts
│   │   │   │   └── attendance.validation.ts
│   │   │   │
│   │   │   ├── academics/
│   │   │   │   ├── academics.controller.ts
│   │   │   │   ├── academics.service.ts
│   │   │   │   ├── academics.routes.ts
│   │   │   │   └── academics.validation.ts
│   │   │   │
│   │   │   ├── marks/
│   │   │   │   ├── marks.controller.ts
│   │   │   │   ├── marks.service.ts
│   │   │   │   ├── marks.routes.ts
│   │   │   │   └── marks.validation.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── reports.controller.ts
│   │   │   │   ├── reports.service.ts
│   │   │   │   ├── reports.routes.ts
│   │   │   │   └── reports.validation.ts
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   ├── notifications.routes.ts
│   │   │   │   └── notifications.validation.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   └── analytics.validation.ts
│   │   │   │
│   │   │   └── fees/
│   │   │       ├── fees.controller.ts
│   │   │       ├── fees.service.ts
│   │   │       ├── fees.routes.ts
│   │   │       └── fees.validation.ts
│   │   │
│   │   ├── services/                     # Shared services
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   ├── push.service.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── pdf.service.ts
│   │   │   ├── queue.service.ts
│   │   │   └── cache.service.ts
│   │   │
│   │   ├── jobs/                         # Background jobs (Bull)
│   │   │   ├── report-generation.job.ts
│   │   │   ├── notification-dispatch.job.ts
│   │   │   ├── attendance-reminder.job.ts
│   │   │   └── data-export.job.ts
│   │   │
│   │   ├── utils/                        # Utility functions
│   │   │   ├── logger.ts
│   │   │   ├── helpers.ts
│   │   │   ├── errors.ts
│   │   │   └── pagination.ts
│   │   │
│   │   └── types/                        # TypeScript types
│   │       ├── express.d.ts              # Express type extensions
│   │       ├── models.ts
│   │       └── responses.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma                 # Database schema
│   │   ├── migrations/                   # Migration files
│   │   └── seed.ts                       # Seed data script
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
├── docs/                                 # Documentation
│   ├── api/                              # API documentation
│   │   ├── auth.md
│   │   ├── students.md
│   │   ├── attendance.md
│   │   ├── academics.md
│   │   └── reports.md
│   │
│   ├── architecture/
│   │   ├── multi-tenant.md
│   │   ├── security.md
│   │   └── scaling.md
│   │
│   └── deployment/
│       ├── vercel.md
│       ├── railway.md
│       └── ci-cd.md
│
├── scripts/                              # DevOps scripts
│   ├── backup.sh
│   ├── seed.sh
│   └── deploy.sh
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # CI pipeline
│   │   ├── cd.yml                        # CD pipeline
│   │   └── lint.yml                      # Lint check
│   └── CODEOWNERS
│
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── turbo.json                            # Turborepo configuration
├── package.json                          # Root package.json (workspaces)
└── README.md
```

---

## 9. Security & Compliance

### 9.1 Authentication & Authorization

1. **JWT Strategy**:
   - Access Token: 15-minute expiry, stored in memory
   - Refresh Token: 7-day expiry, stored in HTTP-only cookie
   - Token rotation on refresh (old refresh token invalidated)
   
2. **Password Policy**:
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number
   - Hashed with bcrypt (salt rounds: 12)
   - Password history (no reuse of last 5 passwords)

3. **Rate Limiting**:
   - Login attempts: 5 per minute per IP
   - API requests: 100 per minute per user
   - Reset password: 3 per hour per email

4. **Session Management**:
   - View active sessions in Settings
   - Revoke individual sessions
   - Force logout on password change

### 9.2 Data Security

1. **Encryption**:
   - At Rest: AES-256 (database level)
   - In Transit: TLS 1.3 (all API traffic)
   - Sensitive fields: PII encrypted at application level

2. **Data Privacy**:
   - Parent can only see own children's data
   - Teacher can only see assigned classes
   - School Admin sees only their school's data
   - Super Admin sees anonymized cross-school data

3. **Audit Trail**:
   - Every create/update/delete operation logged
   - Login/logout timestamps recorded
   - Data export operations logged

### 9.3 PNG Compliance

- **Data Sovereignty**: Option to host within PNG/Australia region (AWS Sydney)
- **Privacy Act**: Compliance with PNG's data protection requirements
- **GDPR Consideration**: If EU students/parents use system

---

## 10. Deployment Strategy

### Phase 1: MVP Launch (Months 1-3)
- **Frontend**: Vercel Pro (1 team, auto-scaling)
- **Backend**: Railway (2-4GB RAM, auto-scaling)
- **Database**: Railway PostgreSQL (10GB storage)
- **File Storage**: Cloudinary (free tier, 25GB)
- **Email**: Resend (100 emails/day free)
- **Monitoring**: Sentry (free tier)

### Phase 2: Growth (Months 4-12)
- **Frontend**: Vercel Enterprise
- **Backend**: Railway Scale (multi-region)
- **Database**: Railway PostgreSQL (100GB) + read replicas
- **Cache**: Upstash Redis
- **CDN**: Cloudflare
- **File Storage**: Cloudinary Pro
- **Email**: SendGrid (50K/month)
- **SMS**: Twilio
- **Monitoring**: Sentry + Datadog

### Phase 3: Scale (Year 2+)
- **Frontend**: Vercel Enterprise (multi-region)
- **Backend**: Docker/Kubernetes on AWS ECS
- **Database**: AWS RDS PostgreSQL with Multi-AZ
- **Cache**: ElastiCache Redis Cluster
- **CDN**: Cloudflare Enterprise
- **File Storage**: AWS S3 + CloudFront
- **Email**: SendGrid Enterprise
- **SMS**: Twilio + local PNG SMS provider
- **Monitoring**: Datadog full suite

---

## 11. Future Features

### 11.1 Short-Term (6-12 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **QR Code Attendance** | Generate QR codes for each student ID card. Teacher scans with phone camera to mark attendance. Reduces marking time from 5 min to 30 sec. | 🔴 High |
| **Bulk Excel Import/Export** | Import students, marks, timetable from Excel. Export any report to Excel. | 🔴 High |
| **School Fee Management** | Track fee structures, payment plans, generate receipts, send due reminders. | 🔴 High |
| **Offline Mode (PWA)** | Service worker cache for offline access. Mark attendance offline, sync when connected. | 🟡 Medium |
| **Parent-Teacher Messaging** | In-app direct messaging between parents and teachers. | 🟡 Medium |
| **Timetable Builder** | Drag-and-drop visual timetable with conflict detection. | 🟡 Medium |

### 11.2 Medium-Term (12-24 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Mobile App (React Native)** | Native mobile app for parents (primary) and teachers. | 🔴 High |
| **RFID Card Attendance** | RFID card readers at school entrance. Auto-mark attendance on card tap. | 🟡 Medium |
| **AI Performance Predictions** | ML model predicts student performance based on attendance, past grades, and engagement. Flags at-risk students early. | 🟡 Medium |
| **Library Management** | Book catalog, check-in/check-out, overdue tracking. | 🟡 Medium |
| **Smart Report Cards** | AI-generated personalized improvement suggestions for each student. | 🟡 Medium |
| **Exam Hall Management** | Seat allocation, invigilator assignment, barcode verification. | 🟢 Low |

### 11.3 Long-Term (24+ months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Face Recognition** | AI-based face recognition for attendance. No physical contact needed. | 🟡 Medium |
| **Hostel Management** | Room allocation, attendance, visitor logs, complaints. | 🟢 Low |
| **Transport Tracking** | GPS-based school bus tracking for parents. Real-time bus location and ETA. | 🟢 Low |
| **Mobile Money Payments** | Integration with PNG mobile money (Digicel, Bmobile). Parents pay fees via mobile. | 🟡 Medium |
| **National Integration** | API integration with PNG Department of Education for aggregate reporting. | 🟡 Medium |
| **E-Learning Module** | Upload lessons, assignments, quizzes. Students submit online. | 🟡 Medium |
| **Voice Interface** | Pidgin English voice commands for marking attendance and checking grades. | 🟢 Low |
| **Blockchain Certificates** | Tamper-proof graduation certificates on blockchain. | 🟢 Low |

---

## 12. Appendices

### Appendix A: API Endpoint Naming Convention

```
Base URL: https://api.png-sms.com/v1

GET    /v1/schools                    # List schools (super admin)
POST   /v1/schools                    # Create school (super admin)
GET    /v1/schools/:id                # Get school details
PATCH  /v1/schools/:id                # Update school

GET    /v1/schools/:id/students       # List students (active by default)
POST   /v1/schools/:id/students       # Register student
GET    /v1/schools/:id/students/:sid  # Get student profile
PATCH  /v1/schools/:id/students/:sid  # Update student
DELETE /v1/schools/:id/students/:sid  # Soft-delete student

GET    /v1/attendance?date=&class=    # Get attendance for date/class
POST   /v1/attendance/batch           # Batch mark attendance
GET    /v1/attendance/student/:id     # Student attendance history
GET    /v1/attendance/reports/monthly # Monthly attendance report

POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/forgot-password
POST   /v1/auth/reset-password
```

### Appendix B: Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format"
            }
        ]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
}
```

### Appendix C: Success Response Format

```json
{
    "success": true,
    "data": { ... },
    "meta": {
        "page": 1,
        "limit": 25,
        "total": 150,
        "totalPages": 6
    },
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### Appendix D: Database Migration Strategy

1. Prisma Migrate for schema versioning
2. All migrations reviewed in PR before applying to production
3. Zero-downtime migrations pattern:
   - Expand phase: Add new columns/tables (non-breaking)
   - Migrate phase: Backfill data
   - Contract phase: Remove old columns after verification
4. Weekly automated backups with 30-day retention

### Appendix E: Testing Strategy

| Layer | Tool | Coverage Goal |
|-------|------|---------------|
| Unit Tests | Vitest | 90%+ |
| Integration Tests | Supertest + Vitest | 80%+ |
| E2E Tests | Playwright | Critical paths |
| Component Tests | Storybook + Testing Library | All components |
| API Tests | Postman/Newman | All endpoints |
| Performance | k6 | <200ms p95 response |
| Security | OWASP ZAP | Quarterly scans |

---

> **Document Status**: v1.0 — Final Draft  
> **Author**: Software Architect  
> **Last Updated**: January 2025

---

*This document serves as the complete blueprint for the PNG School Management System. All development work should reference this document to ensure consistency with the architectural vision.*

