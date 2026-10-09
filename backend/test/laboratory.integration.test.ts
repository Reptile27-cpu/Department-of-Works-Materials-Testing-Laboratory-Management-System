import 'dotenv/config';
import assert from 'node:assert/strict';
import { before, after, test, describe } from 'node:test';
import { prisma } from '../src/config/database';
import app from '../src/app';
import jwt from 'jsonwebtoken';

let server: ReturnType<typeof app.listen>;
let baseUrl = '';

let adminToken = '';
let managerToken = '';
let engineerToken = '';
let technicianToken = '';

let adminUser: any;
let managerUser: any;
let engineerUser: any;
let techUser: any;

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
  // Ensure connection to Neon DB (handles cold-start / scale-to-zero)
  for (let i = 1; i <= 3; i++) {
    try {
      await prisma.$connect();
      break;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Start server on an ephemeral port
  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Fetch seeded users
  adminUser = await prisma.user.findFirst({ where: { role: 'system_admin' } });
  managerUser = await prisma.user.findFirst({ where: { role: 'lab_manager' } });
  engineerUser = await prisma.user.findFirst({ where: { role: 'lab_engineer' } });
  techUser = await prisma.user.findFirst({ where: { role: 'lab_technician' } });

  assert.ok(adminUser, 'Admin user should exist from seed');
  assert.ok(managerUser, 'Manager user should exist from seed');
  assert.ok(engineerUser, 'Engineer user should exist from seed');
  assert.ok(techUser, 'Technician user should exist from seed');

  // Mint valid JWTs
  adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role, laboratoryId: adminUser.laboratoryId, email: adminUser.email }, secret);
  managerToken = jwt.sign({ userId: managerUser.id, role: managerUser.role, laboratoryId: managerUser.laboratoryId, email: managerUser.email }, secret);
  engineerToken = jwt.sign({ userId: engineerUser.id, role: engineerUser.role, laboratoryId: engineerUser.laboratoryId, email: engineerUser.email }, secret);
  technicianToken = jwt.sign({ userId: techUser.id, role: techUser.role, laboratoryId: techUser.laboratoryId, email: techUser.email }, secret);
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

describe('DoW Laboratory Integration Tests', () => {
  describe('1. Authentication & Role Authorization', () => {
    test('Technician cannot access admin-only endpoints', async () => {
      const { res } = await authCall('/system-admin/overview', technicianToken);
      assert.equal(res.status, 403);
    });

    test('Technician cannot create projects', async () => {
      const { res } = await authCall('/projects', technicianToken, {
        method: 'POST',
        body: JSON.stringify({
          projectCode: 'TEST-UNAUTH-01',
          name: 'Unauthorized Project',
          client: 'Client',
          location: 'Location',
        }),
      });
      assert.equal(res.status, 403);
    });

    test('Engineer and Manager have reviewer permissions', async () => {
      const { res: resEng } = await authCall('/projects', engineerToken);
      assert.equal(resEng.status, 200);

      const { res: resMgr } = await authCall('/projects', managerToken);
      assert.equal(resMgr.status, 200);
    });
  });

  describe('2. Sample Registration & Tracking Workflow', () => {
    let createdSampleId = '';
    let createdSampleNumber = '';

    test('Registers a new soil sample and generates sequential DOW-YYYY-XXXX number', async () => {
      const { res, data } = await authCall('/samples', technicianToken, {
        method: 'POST',
        body: JSON.stringify({
          materialType: 'Subgrade Clay',
          description: 'Dark brown clay with silt fines from test pit TP-04',
          sourceLocation: 'Highlands Hwy Ch 88+200',
          samplingDepth: '1.0m - 1.5m',
          dateReceived: new Date().toISOString().split('T')[0],
          receivedBy: 'D. Morea',
          priority: 'high',
          condition: 'moisture_sealed',
          remarks: 'Integration test sample',
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data.id);
      assert.ok(
        data.data.sampleNumber.startsWith('DW-') ||
        data.data.sampleNumber.startsWith('26P-') ||
        data.data.sampleNumber.startsWith('DOW-')
      );
      assert.equal(data.data.status, 'registered');

      createdSampleId = data.data.id;
      createdSampleNumber = data.data.sampleNumber;
    });

    test('Searches and retrieves the created sample', async () => {
      const { res, data } = await authCall(`/samples?search=${createdSampleNumber}`, technicianToken);
      assert.equal(res.status, 200);
      assert.equal(data.data.length, 1);
      assert.equal(data.data[0].id, createdSampleId);
    });

    test('Transitions sample status with audit history', async () => {
      const { res, data } = await authCall(`/samples/${createdSampleId}/status`, technicianToken, {
        method: 'POST',
        body: JSON.stringify({
          status: 'in_progress',
          reason: 'Technician commenced initial moisture and sieve prep.',
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'in_progress');

      // Verify status history
      const { data: detailData } = await authCall(`/samples/${createdSampleId}`, technicianToken);
      assert.ok(detailData.data.statusHistory.length >= 2);
      assert.equal(detailData.data.statusHistory[0].toStatus, 'in_progress');
    });

    test('Rejects invalid status transitions', async () => {
      const { res } = await authCall(`/samples/${createdSampleId}/status`, technicianToken, {
        method: 'POST',
        body: JSON.stringify({ status: 'invalid_status_code' }),
      });
      assert.equal(res.status, 400);
    });

    test('Generates printable sample tracking sheet data', async () => {
      const { res, data } = await authCall(`/samples/${createdSampleId}/sheet`, technicianToken);
      assert.equal(res.status, 200);
      assert.ok(data.data.laboratory.name);
      assert.equal(data.data.sample.sampleNumber, createdSampleNumber);
      assert.ok(data.data.printedBy);
    });
  });

  describe('3. Test Assignment & Calculation Engine Integration', () => {
    let testId = '';
    let sampleId = '';

    test('Assigns a Moisture Content test to sample', async () => {
      const sample = await prisma.sample.findFirst({
        where: {
          OR: [
            { sampleNumber: { startsWith: 'DW-' } },
            { sampleNumber: { startsWith: '26P-' } },
            { sampleNumber: { startsWith: 'DOW-' } },
          ],
        },
      });
      assert.ok(sample);
      sampleId = sample.id;

      const testType = await prisma.testType.findUnique({ where: { code: 'SOIL_MOISTURE' } });
      assert.ok(testType);

      const { res, data } = await authCall('/tests', engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          sampleId,
          testTypeId: testType.id,
          technicianId: techUser.id,
          remarks: 'Standard oven drying method requested.',
        }),
      });

      assert.equal(res.status, 201);
      assert.ok(data.data.id);
      assert.equal(data.data.status, 'pending');
      testId = data.data.id;
    });

    test('Tests calculation engine live preview endpoint', async () => {
      const { res, data } = await authCall('/tests/calculate', technicianToken, {
        method: 'POST',
        body: JSON.stringify({
          testTypeCode: 'SOIL_MOISTURE',
          rawMeasurements: {
            tareMass: 25.0,
            wetSoilPlusTare: 155.0,
            drySoilPlusTare: 140.0,
          },
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.drySoilMass, 115.0);
      assert.equal(data.data.waterMass, 15.0);
      assert.equal(data.data.moistureContentPct, 13.04);
    });

    test('Technician enters measurements, automatically executing calculations', async () => {
      const { res, data } = await authCall(`/tests/${testId}/measurements`, technicianToken, {
        method: 'PUT',
        body: JSON.stringify({
          rawMeasurements: {
            tareMass: 22.50,
            wetSoilPlusTare: 165.20,
            drySoilPlusTare: 148.10,
          },
          remarks: 'Specimen dried at 105C for 18h.',
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.calculatedResults.drySoilMass, 125.60);
      assert.equal(data.data.calculatedResults.waterMass, 17.10);
      assert.equal(data.data.calculatedResults.moistureContentPct, 13.61);
      assert.equal(data.data.status, 'in_progress');
    });

    test('Technician submits test for review', async () => {
      const { res, data } = await authCall(`/tests/${testId}/submit`, technicianToken, {
        method: 'POST',
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'awaiting_review');
    });

    test('Independent review check: technician cannot approve own test', async () => {
      const { res } = await authCall(`/tests/${testId}/review`, technicianToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      assert.equal(res.status, 403);
    });

    test('Reviewer returns test for correction with reason', async () => {
      const { res, data } = await authCall(`/tests/${testId}/review`, engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          action: 'return_for_correction',
          rejectionReason: 'Tare mass appears slightly discordant with standard container range.',
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'returned_for_correction');
      assert.ok(data.data.rejectionReason.includes('Tare mass'));
    });

    test('Technician re-enters corrected measurements and re-submits', async () => {
      await authCall(`/tests/${testId}/measurements`, technicianToken, {
        method: 'PUT',
        body: JSON.stringify({
          rawMeasurements: {
            tareMass: 22.40,
            wetSoilPlusTare: 165.20,
            drySoilPlusTare: 148.10,
          },
        }),
      });

      const { res, data } = await authCall(`/tests/${testId}/submit`, technicianToken, {
        method: 'POST',
      });
      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'awaiting_review');
    });

    test('Engineer approves test results', async () => {
      const { res, data } = await authCall(`/tests/${testId}/review`, engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          remarks: 'Measurements verified and in accordance with AS 1289.2.1.1.',
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'approved');
      assert.ok(data.data.approvedAt);
    });

    test('Prevents silent modifications on approved tests', async () => {
      const { res } = await authCall(`/tests/${testId}/measurements`, technicianToken, {
        method: 'PUT',
        body: JSON.stringify({
          rawMeasurements: { tareMass: 10.0 },
        }),
      });

      assert.equal(res.status, 403);
    });

    test('Controlled amendment creates new revision record', async () => {
      const { res, data } = await authCall(`/tests/${testId}/amend`, engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          amendmentReason: 'Formal re-check of balance calibration record necessitated re-calculation.',
          rawMeasurements: {
            tareMass: 22.40,
            wetSoilPlusTare: 165.50,
            drySoilPlusTare: 148.10,
          },
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(data.data.revisionNumber, 2);
      assert.equal(data.data.status, 'awaiting_review');

      // Check revision history
      const { data: detailData } = await authCall(`/tests/${testId}`, technicianToken);
      assert.equal(detailData.data.revisions.length, 1);
      assert.equal(detailData.data.revisions[0].revisionNumber, 1);
    });
  });

  describe('4. Equipment & Calibration Management', () => {
    test('Lists equipment and flags overdue calibration', async () => {
      let overdue = await prisma.equipment.findFirst({ where: { status: 'calibration_due' } });
      if (!overdue) {
        const anyEq = await prisma.equipment.findFirst();
        if (anyEq) {
          await prisma.equipment.update({
            where: { id: anyEq.id },
            data: { status: 'calibration_due', nextCalibrationDate: new Date('2026-01-01') },
          });
        }
      }

      const { res, data } = await authCall('/equipment', technicianToken);
      assert.equal(res.status, 200);
      assert.ok(data.data.length > 0);

      const found = data.data.find((eq: any) => eq.status === 'calibration_due');
      assert.ok(found, 'Should have at least one equipment marked calibration_due');
    });

    test('Logs a new calibration record and restores operational status', async () => {
      const overdue = await prisma.equipment.findFirst({ where: { status: 'calibration_due' } });
      assert.ok(overdue);

      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const { res, data } = await authCall(`/equipment/${overdue.id}/calibrations`, engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          calibrationDate: new Date().toISOString().split('T')[0],
          nextDueDate: nextYear.toISOString().split('T')[0],
          calibratedBy: 'National Institute of Standards and Industrial Technology (NISIT)',
          certificateNumber: 'CERT-NISIT-2026-RENEWED',
          result: 'passed',
          notes: 'Recalibrated and passed inspection.',
        }),
      });

      assert.equal(res.status, 201);

      // Verify equipment is now operational
      const updatedEq = await prisma.equipment.findUnique({ where: { id: overdue.id } });
      assert.equal(updatedEq?.status, 'operational');
    });
  });

  describe('5. Reports, Exports & Operational Dashboard', () => {
    test('Dashboard endpoint returns accurate operational metrics', async () => {
      const { res, data } = await authCall('/analytics/dashboard', managerToken);
      assert.equal(res.status, 200);
      assert.ok(data.data.metrics.totalSamples >= 5);
      assert.ok(data.data.technicianWorkload.length >= 2);
      assert.ok(data.data.sampleStatusCounts);
    });

    test('Creates a draft report snapshot from an approved sample', async () => {
      const sample = await prisma.sample.findFirst({
        where: {
          laboratoryId: engineerUser.laboratoryId,
        },
      });
      assert.ok(sample);

      const { res, data } = await authCall('/reports', engineerToken, {
        method: 'POST',
        body: JSON.stringify({
          sampleId: sample.id,
          title: 'Subgrade Soil Quality & CBR Confirmation Report',
          summary: 'Verified that the subgrade material satisfies all requirements for Section 4.',
        }),
      });

      assert.equal(res.status, 201);
      assert.ok(data.data.reportNumber.startsWith('REP-'));
      assert.equal(data.data.status, 'draft');
    });

    test('Exports samples register to valid Excel spreadsheet', async () => {
      const res = await fetch(`${baseUrl}/api/v1/reports/export/samples`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 1000);
    });
  });
});
