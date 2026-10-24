import 'dotenv/config';
import assert from 'node:assert/strict';
import { before, after, test, describe } from 'node:test';
import { prisma } from '../src/config/database';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TEST_FORM_REGISTRY } from '../src/modules/test-forms/test-form-registry';

let server: ReturnType<typeof app.listen>;
let baseUrl = '';
let managerToken = '';
let managerUser: any;
let testSample: any;
let testRequest: any;
let testLabTests: any[] = [];
let foreignTech: any;
let foreignLab: any;

const secret = process.env.JWT_SECRET || 'dow-lab-system-dev-jwt-secret-key-2026';

const apiCall = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
};

const authCall = (path: string, token: string, options: RequestInit = {}) => {
  return apiCall(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

before(async () => {
  // Connect DB
  await prisma.$connect();

  // Ephemeral port
  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Get or seed a manager user
  managerUser = await prisma.user.findFirst({
    where: { role: 'lab_manager' },
  });

  if (!managerUser) {
    managerUser = await prisma.user.findFirst();
  }

  managerToken = jwt.sign(
    {
      userId: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
      laboratoryId: managerUser.laboratoryId,
    },
    secret,
    { expiresIn: '1h' }
  );

  // Find or create test request + sample with tests for verification
  let lab = await prisma.laboratory.findFirst();
  if (!lab) {
    lab = await prisma.laboratory.create({
      data: {
        id: uuidv4(),
        code: 'POM-CENTRAL',
        name: 'Central Materials Laboratory',
        location: '4 Mile, Port Moresby',
        region: 'Southern',
      },
    });
  }

  // Create an isolated foreign laboratory and technician to verify multi-tenant isolation
  foreignLab = await prisma.laboratory.create({
    data: {
      id: uuidv4(),
      code: `LAB-EXT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'External Regional Laboratory',
      department: 'Highways',
      division: 'Materials',
      province: 'Morobe',
      district: 'Lae',
      address: 'Lae Wharf Road',
      sampleIdPrefix: 'LAE',
      reportIdPrefix: 'REP-LAE',
    },
  });

  foreignTech = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: `foreign-tech-${Math.floor(1000 + Math.random() * 9000)}@dow.gov.pg`,
      firstName: 'Foreign',
      lastName: 'Technician',
      role: 'lab_technician',
      passwordHash: 'dummy-hash',
      laboratoryId: foreignLab.id,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  let client = await prisma.client.findFirst();
  if (!client) {
    client = await prisma.client.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        clientCode: 'CLI-TEST-001',
        name: 'PNG Department of Works Integration Client',
        updatedAt: new Date(),
      },
    });
  }

  let project = await prisma.project.findFirst();
  if (!project) {
    project = await prisma.project.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        projectCode: 'PRJ-TEST-001',
        name: 'Highlands Highway Culvert Works',
        client: client.name,
        location: 'Kassam Pass',
      },
    });
  }

  // Find 2 test types: one with template (AGG_PSD_DRY) and one without (CONC_FLEXURAL_RUPTURE)
  const psdType = await prisma.testType.findFirst({ where: { code: 'AGG_PSD_DRY' } });
  const flexType = await prisma.testType.findFirst({ where: { code: 'CONC_FLEXURAL_RUPTURE' } });

  const requestId = uuidv4();
  const sampleId = uuidv4();
  const sampleNumber = `26P-S-TST${Math.floor(100 + Math.random() * 900)}`;
  const qrToken = uuidv4();

  testRequest = await prisma.testingRequest.create({
    data: {
      id: requestId,
      laboratoryId: lab.id,
      clientId: client.id,
      projectId: project.id,
      requestNumber: `RQ-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      location: 'Kassam Pass Chainage 24+500',
      materialSource: 'Markham River Pit',
      sampleDescription: 'Coarse aggregate & concrete beams for test forms verification',
      priority: 'normal',
      status: 'converted_to_sample',
      updatedAt: new Date(),
    },
  });

  testSample = await prisma.sample.create({
    data: {
      id: sampleId,
      laboratoryId: lab.id,
      projectId: project.id,
      requestId: testRequest.id,
      sampleNumber,
      qrToken,
      materialType: 'Aggregates',
      description: 'Test Specimen for Form Verification',
      sourceLocation: 'Markham River Pit',
      clientReference: testRequest.requestNumber,
      dateReceived: new Date(),
      receivedBy: managerUser.email || 'registrar@dow.gov.pg',
      status: 'in_progress',
      createdById: managerUser.id,
    },
  });

  if (psdType) {
    const t1 = await prisma.labTest.create({
      data: {
        id: uuidv4(),
        sampleId: testSample.id,
        testTypeId: psdType.id,
        testNumber: `TST-INT-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'in_progress',
        remarks: 'Test form verification item 1',
      },
      include: { testType: true },
    });
    testLabTests.push(t1);
  }

  if (flexType) {
    const t2 = await prisma.labTest.create({
      data: {
        id: uuidv4(),
        sampleId: testSample.id,
        testTypeId: flexType.id,
        testNumber: `TST-INT-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'pending',
        remarks: 'Test form verification item 2 (fallback label)',
      },
      include: { testType: true },
    });
    testLabTests.push(t2);
  }
});

after(async () => {
  // Clean up created test data safely
  if (testLabTests.length > 0) {
    await prisma.labTest.deleteMany({
      where: { id: { in: testLabTests.map((t) => t.id) } },
    });
  }
  if (testSample) {
    await prisma.sample.deleteMany({ where: { id: testSample.id } });
  }
  if (testRequest) {
    await prisma.testingRequest.deleteMany({ where: { id: testRequest.id } });
  }
  if (foreignTech) {
    await prisma.user.deleteMany({ where: { id: foreignTech.id } });
  }
  if (foreignLab) {
    await prisma.laboratory.deleteMany({ where: { id: foreignLab.id } });
  }

  await prisma.$disconnect();
  if (server) {
    server.close();
  }
});

describe('DoW MS QR-Linked Test Forms & Scanning Workflow Tests', () => {
  test('1. Security: Unauthenticated requests to /test-forms must be rejected (401)', async () => {
    const { res } = await apiCall('/test-forms/mapping');
    assert.equal(res.status, 401, 'Expected 401 Unauthorized for unauthenticated request');
  });

  test('2. Registry: GET /test-forms/mapping returns accurate inventory and catalogue coverage', async () => {
    const { res, data } = await authCall('/test-forms/mapping', managerToken);
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.summary.totalTests >= 41, 'Should include at least 41 tests');
    assert.equal(data.data.summary.templatesAvailable, 32, 'Exactly 32 tests must have templates');
    assert.equal(data.data.summary.fallbackLabelOnly, 9, 'Exactly 9 tests must use label fallback');

    // Verify key test mappings
    const psd = data.data.mapping.find((m: any) => m.code === 'AGG_PSD_DRY');
    assert.ok(psd);
    assert.equal(psd.hasTemplate, true);
    assert.equal(psd.formNumber, 'Form A_11');

    const flex = data.data.mapping.find((m: any) => m.code === 'CONC_FLEXURAL_RUPTURE');
    assert.ok(flex);
    assert.equal(flex.hasTemplate, false);
  });

  test('3. Test Form PDF: GET /test-forms/test/:id/pdf generates stamped official PDF', async () => {
    const testWithTemplate = testLabTests.find((t) => t.testType.code === 'AGG_PSD_DRY');
    if (!testWithTemplate) return;

    const res = await fetch(`${baseUrl}/api/v1/test-forms/test/${testWithTemplate.id}/pdf`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('x-dow-has-template'), 'true');

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 50000, 'PDF buffer must contain substantial document content');
    // Verify PDF header magic bytes
    assert.equal(buffer.slice(0, 4).toString(), '%PDF');
  });

  test('4. Printable Label Fallback: GET /test-forms/test/:id/label generates clean tracking label', async () => {
    const testItem = testLabTests[0];
    const res = await fetch(`${baseUrl}/api/v1/test-forms/test/${testItem.id}/label`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 1000);
    assert.equal(buffer.slice(0, 4).toString(), '%PDF');
  });

  test('5. Sample Forms List: GET /test-forms/sample/:sampleId returns form statuses', async () => {
    const { res, data } = await authCall(`/test-forms/sample/${testSample.id}`, managerToken);
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.sample.sampleNumber, testSample.sampleNumber);
    assert.ok(Array.isArray(data.data.forms));
    assert.equal(data.data.forms.length, testLabTests.length);
  });

  test('6. Consolidated Bundle: GET /test-forms/sample/:sampleId/bundle merges all forms', async () => {
    const res = await fetch(`${baseUrl}/api/v1/test-forms/sample/${testSample.id}/bundle`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('x-dow-total-forms'), String(testLabTests.length));

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 20000);
    assert.equal(buffer.slice(0, 4).toString(), '%PDF');
  });

  test('7. Misplaced-Form Recovery: Scanning QR payload resolves specimen, request, and tests', async () => {
    const qrPayload = `DOW-MS|SAMPLE|${testSample.sampleNumber}|${testSample.qrToken}`;

    const { res, data } = await authCall(
      `/samples/scan/${encodeURIComponent(qrPayload)}`,
      managerToken
    );

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.sample.sampleNumber, testSample.sampleNumber);
    assert.equal(data.data.sample.materialType, testSample.materialType);
    assert.ok(data.data.sample.request, 'Must include associated testing request');
    assert.equal(data.data.sample.request.requestNumber, testRequest.requestNumber);
    assert.ok(data.data.sample.tests.length >= testLabTests.length);

    // Verify audit log was recorded
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: testSample.id,
        action: 'QR_SCANNED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(auditLog, 'Audit log entry for QR_SCANNED must be recorded');
  });

  test('8. Request-level Forms: GET /test-forms/request/:requestId maps all requested items', async () => {
    const { res, data } = await authCall(`/test-forms/request/${testRequest.id}`, managerToken);
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.request.requestNumber, testRequest.requestNumber);
    assert.ok(data.data.sample);
    assert.equal(data.data.sample.sampleNumber, testSample.sampleNumber);
  });

  test('9. RBAC & Tenant Isolation: Unauthorized laboratory user rejected with 403', async () => {
    const unauthorizedToken = jwt.sign(
      {
        userId: foreignTech.id,
        email: foreignTech.email,
        role: foreignTech.role,
        laboratoryId: foreignTech.laboratoryId,
      },
      secret,
      { expiresIn: '1h' }
    );

    // 1. Attempt accessing test form PDF from unauthorized laboratory
    const testId = testLabTests[0].id;
    const resPdf = await fetch(`${baseUrl}/api/v1/test-forms/test/${testId}/pdf`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert.equal(resPdf.status, 403, 'Cross-tenant form PDF access must be rejected with 403');

    // 2. Attempt accessing sample bundle from unauthorized laboratory
    const resBundle = await fetch(`${baseUrl}/api/v1/test-forms/sample/${testSample.id}/bundle`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert.equal(resBundle.status, 403, 'Cross-tenant sample bundle access must be rejected with 403');

    // 3. Attempt accessing sample forms list from unauthorized laboratory
    const resForms = await fetch(`${baseUrl}/api/v1/test-forms/sample/${testSample.id}`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert.equal(resForms.status, 403, 'Cross-tenant sample forms access must be rejected with 403');
  });
});
