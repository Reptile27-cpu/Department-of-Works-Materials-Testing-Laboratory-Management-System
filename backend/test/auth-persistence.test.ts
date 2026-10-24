import 'dotenv/config';
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import app from '../src/app';
import { prisma } from '../src/config/database';

describe('Auth Persistence & Cookie Lifecycle Integration', () => {
  let server: ReturnType<typeof app.listen>;
  let baseUrl = '';
  let loginCookie = '';
  let refreshTokenValue = '';
  let accessToken = '';

  const testEmail = `persistence-test-${Date.now()}@dow.gov.pg`;
  const testPassword = 'StrongPassword123!';
  let testUserId = '';

  before(async () => {
    for (let i = 1; i <= 3; i++) {
      try {
        await prisma.$connect();
        break;
      } catch (e) {
        if (i === 3) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Get an existing laboratory ID or use default
    const lab = await prisma.laboratory.findFirst();

    // Create a dedicated test user
    const passwordHash = await bcrypt.hash(testPassword, 10);
    testUserId = uuidv4();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        passwordHash,
        firstName: 'Test',
        lastName: 'Persist',
        role: 'system_admin',
        isActive: true,
        emailVerified: true,
        laboratoryId: lab?.id,
      },
    });

    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  });

  after(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  it('1. POST /api/v1/auth/login sets HttpOnly 7-day cookie and returns accessToken', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Login should succeed, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken, 'accessToken should be returned');
    accessToken = body.data.accessToken;

    // Verify refreshToken is NOT returned in JSON body
    assert.strictEqual(body.data.refreshToken, undefined, 'refreshToken should not be in JSON body');

    // Verify Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header must be present');
    assert.match(setCookie, /refreshToken=/i, 'refreshToken cookie must be set');
    assert.match(setCookie, /HttpOnly/i, 'Cookie must be HttpOnly');
    assert.match(setCookie, /Path=\/api\/v1\/auth/i, 'Cookie must have Path=/api/v1/auth');

    // Extract cookie value
    const match = setCookie.match(/refreshToken=([^;]+)/);
    assert.ok(match && match[1], 'Should extract refreshToken value');
    refreshTokenValue = match[1];
    loginCookie = `refreshToken=${refreshTokenValue}`;

    // Verify database record has matching refreshToken
    const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.strictEqual(dbUser?.refreshToken, refreshTokenValue, 'refreshToken in database must match cookie value');
  });

  it('2. Authenticated endpoint /api/v1/auth/profile works with Bearer accessToken', async () => {
    const res = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.email, testEmail);
    assert.strictEqual(body.data.role, 'system_admin');
  });

  it('3. /api/v1/auth/profile rejects expired / invalid tokens with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.expired.token' },
    });

    assert.strictEqual(res.status, 401);
  });

  it('4. POST /api/v1/auth/refresh restores session using ONLY the HttpOnly cookie', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: loginCookie,
      },
      body: JSON.stringify({}),
    });

    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Refresh should succeed, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken, 'New accessToken should be issued');
    assert.notStrictEqual(body.data.accessToken, accessToken, 'New accessToken should be rotated/refreshed');

    // Check cookie rotation
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Rotated Set-Cookie must be present');
    assert.match(setCookie, /refreshToken=/i);

    const match = setCookie.match(/refreshToken=([^;]+)/);
    assert.ok(match && match[1]);
    const newRefreshToken = match[1];
    assert.notStrictEqual(newRefreshToken, refreshTokenValue, 'Refresh token should rotate in database and cookie');

    // Update for subsequent tests
    loginCookie = `refreshToken=${newRefreshToken}`;
    accessToken = body.data.accessToken;
  });

  it('5. POST /api/v1/auth/logout revokes session in DB and clears cookie even when unauthenticated', async () => {
    // Send logout with Cookie only, NO Authorization header (simulating expired access token at logout time)
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: loginCookie,
      },
      body: JSON.stringify({}),
    });

    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Logout should succeed, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.success, true);

    // Verify Set-Cookie clears cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header must be present on logout');
    assert.match(setCookie, /refreshToken=/i);
    assert.match(setCookie, /Max-Age=0|expires=/i, 'Cookie should be cleared with Max-Age=0 or expired date');

    // Verify database record has refreshToken cleared
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    assert.strictEqual(user?.refreshToken, null, 'User refreshToken in DB must be cleared to null');
  });

  it('6. Refreshing again after logout fails with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: loginCookie,
      },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 401);
  });
});

