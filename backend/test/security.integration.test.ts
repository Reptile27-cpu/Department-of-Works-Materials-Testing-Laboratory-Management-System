import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env' });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const normalDatabaseUrl = process.env.DATABASE_URL;
const productionProjectRef = 'lwenayjtljkldrhxfqok';
const safetyError = !testDatabaseUrl
  ? 'TEST_DATABASE_URL must be set to an isolated non-production database'
  : process.env.NODE_ENV === 'production'
    ? 'Tests refuse to run with NODE_ENV=production'
    : testDatabaseUrl === normalDatabaseUrl
      ? 'TEST_DATABASE_URL must differ from DATABASE_URL'
      : testDatabaseUrl.includes(productionProjectRef)
        ? 'Tests refuse to run against the configured production Supabase project'
        : undefined;
const enabled = !safetyError;

let app: typeof import('../src/app').default;
let prisma: typeof import('@prisma/client').PrismaClient;
let server: ReturnType<typeof app.listen>;
let schoolA: { id: string };
let schoolB: { id: string };
let adminA: { id: string; email: string };
let adminB: { id: string; email: string };
let systemAdmin: { id: string; email: string };
let studentA: { id: string };
let studentB: { id: string };
let adminAToken = '';
let adminBToken = '';
let systemAdminToken = '';

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
};

const authRequest = (path: string, token: string, options: RequestInit = {}) =>
  request(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });

const hashOtp = (otp: string) => require('node:crypto').createHash('sha256').update(otp).digest('hex');

let originalDatabaseUrl: string | undefined;

before(async () => {
  if (!enabled) return;
  originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-jwt-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-only-refresh-secret';
  process.env.NODE_ENV = 'test';
  ({ default: app } = await import('../src/app'));
  ({ prisma } = await import('../src/config/database'));
  await prisma.$connect();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  schoolA = await prisma.school.create({ data: { id: uuidv4(), name: 'Isolation Test A', code: `TEST-A-${Date.now()}` } });
  schoolB = await prisma.school.create({ data: { id: uuidv4(), name: 'Isolation Test B', code: `TEST-B-${Date.now()}` } });
  adminA = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolA.id, email: `admin-a-${Date.now()}@test.invalid`, passwordHash, firstName: 'Admin', lastName: 'A', role: 'school_admin', emailVerified: true } });
  adminB = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolB.id, email: `admin-b-${Date.now()}@test.invalid`, passwordHash, firstName: 'Admin', lastName: 'B', role: 'school_admin', emailVerified: true } });
  systemAdmin = await prisma.user.create({ data: { id: uuidv4(), email: `system-${Date.now()}@test.invalid`, passwordHash, firstName: 'System', lastName: 'Admin', role: 'super_admin', emailVerified: true } });
  studentA = await prisma.student.create({ data: { id: uuidv4(), schoolId: schoolA.id, studentId: `ST-A-${Date.now()}`, firstName: 'Student', lastName: 'A', dateOfBirth: new Date('2010-01-01'), enrollmentDate: new Date() } });
  studentB = await prisma.student.create({ data: { id: uuidv4(), schoolId: schoolB.id, studentId: `ST-B-${Date.now()}`, firstName: 'Student', lastName: 'B', dateOfBirth: new Date('2010-01-01'), enrollmentDate: new Date() } });
  server = app.listen(0);

  const login = async (email: string) => {
    const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Password123!' }) });
    assert.equal(result.response.status, 200);
    return result.body.data.accessToken as string;
  };
  adminAToken = await login(adminA.email);
  adminBToken = await login(adminB.email);
  systemAdminToken = await login(systemAdmin.email);
});

if (!enabled) {
  test('test database safety preflight', () => {
    assert.fail(safetyError);
  });
}

after(async () => {
  if (!enabled) return;
  try {
    server?.close();
    await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    await prisma.user.delete({ where: { id: systemAdmin.id } });
    await prisma.$disconnect();
  } finally {
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
});

test('does not activate registration when email delivery is unavailable', { skip: !enabled }, async () => {
  const email = `register-${Date.now()}@test.invalid`;
  const previousApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const register = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      }),
    });

    assert.equal(register.response.status, 503);
    assert.equal(register.body.error.code, 'EMAIL_DELIVERY_FAILED');

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!' }),
    });

    assert.equal(login.response.status, 401);
  } finally {
    if (previousApiKey) {
      process.env.RESEND_API_KEY = previousApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  }
});

test('rejects unauthenticated protected access', { skip: !enabled }, async () => {
  const result = await request('/students');
  assert.equal(result.response.status, 401);
});

test('allows School A admin to read only School A students', { skip: !enabled }, async () => {
  const result = await authRequest('/students', adminAToken);
  assert.equal(result.response.status, 200);
  assert.ok(result.body.data.every((student: { schoolId: string }) => student.schoolId === schoolA.id));
  const other = await authRequest(`/students/${studentB.id}`, adminAToken);
  assert.equal(other.response.status, 404);
});

test('allows each school admin to read its own school and denies cross-school IDs', { skip: !enabled }, async () => {
  const own = await authRequest(`/students/${studentB.id}`, adminBToken);
  assert.equal(own.response.status, 200);
  const crossSchool = await authRequest(`/students/${studentA.id}`, adminBToken);
  assert.equal(crossSchool.response.status, 404);
});

test('does not let a school admin create a resource for another school', { skip: !enabled }, async () => {
  const result = await authRequest('/classes', adminAToken, { method: 'POST', body: JSON.stringify({ schoolId: schoolB.id, name: 'Attempted Cross School', grade: '10' }) });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.data.schoolId, schoolA.id);
});

test('allows system admin cross-school visibility and blocks school admin portal access', { skip: !enabled }, async () => {
  const schools = await authRequest('/system-admin/schools', systemAdminToken);
  assert.equal(schools.response.status, 200);
  const denied = await authRequest('/system-admin/schools', adminAToken);
  assert.equal(denied.response.status, 403);
});

test('rejects expired access tokens', { skip: !enabled }, async () => {
  const expired = jwt.sign({ userId: adminA.id, role: 'school_admin', schoolId: schoolA.id, email: adminA.email }, process.env.JWT_SECRET!, { expiresIn: -1 });
  const result = await authRequest('/students', expired);
  assert.equal(result.response.status, 401);
});

test('rejects privileged public registration role tampering', { skip: !enabled }, async () => {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email: `attacker-${Date.now()}@test.invalid`, password: 'Password123!', firstName: 'Attacker', lastName: 'Test', role: 'super_admin', schoolId: schoolB.id }) });
  assert.equal(result.response.status, 400);
});

test('rejects reused and wrong-purpose OTPs', { skip: !enabled }, async () => {
  const otpUser = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolA.id, email: `otp-${Date.now()}@test.invalid`, passwordHash: await bcrypt.hash('Password123!', 10), firstName: 'Otp', lastName: 'User', role: 'student', emailVerified: false } });
  await prisma.emailOtp.create({ data: { id: uuidv4(), userId: otpUser.id, purpose: 'password_reset', otpHash: hashOtp('123456'), expiresAt: new Date(Date.now() + 600000) } });
  const wrongPurpose = await request('/auth/email-otp/verify', { method: 'POST', body: JSON.stringify({ email: otpUser.email, otp: '123456' }) });
  assert.equal(wrongPurpose.response.status, 401);
  await prisma.emailOtp.updateMany({ where: { userId: otpUser.id }, data: { purpose: 'email_verification' } });
  const verified = await request('/auth/email-otp/verify', { method: 'POST', body: JSON.stringify({ email: otpUser.email, otp: '123456' }) });
  assert.equal(verified.response.status, 200);
  const reused = await request('/auth/email-otp/verify', { method: 'POST', body: JSON.stringify({ email: otpUser.email, otp: '123456' }) });
  assert.notEqual(reused.response.status, 200);
  await prisma.user.delete({ where: { id: otpUser.id } });
});

test('rejects disabled users and inactive schools', { skip: !enabled }, async () => {
  await prisma.user.update({ where: { id: adminA.id }, data: { isActive: false } });
  const disabledUser = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: adminA.email, password: 'Password123!' }) });
  assert.equal(disabledUser.response.status, 401);
  await prisma.user.update({ where: { id: adminA.id }, data: { isActive: true } });

  await prisma.school.update({ where: { id: schoolB.id }, data: { isActive: false } });
  const disabledSchool = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: adminB.email, password: 'Password123!' }) });
  assert.equal(disabledSchool.response.status, 401);
  await prisma.school.update({ where: { id: schoolB.id }, data: { isActive: true } });
});

test('supports password reset and invalidates the reset OTP', { skip: !enabled }, async () => {
  const email = `reset-${Date.now()}@test.invalid`;
  const user = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolA.id, email, passwordHash: await bcrypt.hash('OldPassword123!', 10), firstName: 'Reset', lastName: 'User', role: 'student', emailVerified: true } });
  await prisma.emailOtp.create({ data: { id: uuidv4(), userId: user.id, purpose: 'password_reset', otpHash: hashOtp('654321'), expiresAt: new Date(Date.now() + 600000) } });
  const reset = await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp: '654321', password: 'NewPassword123!' }) });
  assert.equal(reset.response.status, 200);
  const reused = await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp: '654321', password: 'AnotherPassword123!' }) });
  assert.equal(reused.response.status, 401);
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'NewPassword123!' }) });
  assert.equal(login.response.status, 200);
  await prisma.user.delete({ where: { id: user.id } });
});

test('enforces role permissions on administrative operations', { skip: !enabled }, async () => {
  const teacherLike = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolA.id, email: `teacher-${Date.now()}@test.invalid`, passwordHash: await bcrypt.hash('Password123!', 10), firstName: 'Teacher', lastName: 'Test', role: 'teacher', emailVerified: true } });
  const studentLike = await prisma.user.create({ data: { id: uuidv4(), schoolId: schoolA.id, email: `student-${Date.now()}@test.invalid`, passwordHash: await bcrypt.hash('Password123!', 10), firstName: 'Student', lastName: 'Test', role: 'student', emailVerified: true } });
  const login = async (email: string) => (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Password123!' }) })).body.data.accessToken as string;
  const teacherToken = await login(teacherLike.email);
  const studentToken = await login(studentLike.email);
  assert.equal((await authRequest('/system-admin/dashboard', adminAToken)).response.status, 403);
  assert.equal((await authRequest('/schools', teacherToken)).response.status, 403);
  assert.equal((await authRequest('/students', studentToken)).response.status, 403);
  await prisma.user.deleteMany({ where: { id: { in: [teacherLike.id, studentLike.id] } } });
});

test('isolates school branding and validates colors', { skip: !enabled }, async () => {
  const own = await authRequest(`/schools/${schoolA.id}/branding`, adminAToken);
  assert.equal(own.response.status, 200);
  assert.equal(own.body.data.schoolId, schoolA.id);

  const crossSchool = await authRequest(`/schools/${schoolB.id}/branding`, adminAToken);
  assert.equal(crossSchool.response.status, 404);

  const deniedUpdate = await authRequest(`/system-admin/schools/${schoolA.id}/branding`, adminAToken, {
    method: 'PATCH',
    body: JSON.stringify({ primaryColor: '#FF0000' }),
  });
  assert.equal(deniedUpdate.response.status, 403);

  const invalidColor = await authRequest(`/system-admin/schools/${schoolA.id}/branding`, systemAdminToken, {
    method: 'PATCH',
    body: JSON.stringify({ primaryColor: 'javascript:alert(1)' }),
  });
  assert.equal(invalidColor.response.status, 400);

  const updated = await authRequest(`/system-admin/schools/${schoolA.id}/branding`, systemAdminToken, {
    method: 'PATCH',
    body: JSON.stringify({ primaryColor: '#123456', secondaryColor: '#FFFFFF', backgroundColor: '#F8FAFC' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.primaryColor, '#123456');
});
