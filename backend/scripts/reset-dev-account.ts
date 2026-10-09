import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../src/config/database';

/**
 * Utility to securely create or reset designated development accounts
 * for the DOW Materials Testing Laboratory Management System.
 */
async function resetDevAccount() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run reset-dev-account in production environment.');
  }

  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];
  const passArg = args.find((a) => a.startsWith('--password='))?.split('=')[1];
  const roleArg = args.find((a) => a.startsWith('--role='))?.split('=')[1];

  if (!passArg) {
    throw new Error(
      'An explicit password argument is required. Usage: npx tsx scripts/reset-dev-account.ts --password=<SECURE_PASSWORD> [--email=<EMAIL>] [--role=<ROLE>]'
    );
  }

  if (passArg.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passArg)) {
    throw new Error(
      'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.'
    );
  }

  const targetEmail = emailArg || 'manager@dow.gov.pg';
  const targetPassword = passArg;
  const targetRole = roleArg || (targetEmail.includes('admin') ? 'system_admin' : targetEmail.includes('worker') ? 'lab_worker' : 'lab_manager');

  console.log(`🔐 Processing development account: ${targetEmail}`);

  // Ensure laboratory organization exists
  let lab = await prisma.laboratory.findFirst({
    where: { isActive: true },
  });

  if (!lab) {
    lab = await prisma.laboratory.create({
      data: {
        id: uuidv4(),
        name: 'Central Materials Testing Laboratory',
        code: 'CMTL-POM',
        department: 'Department of Works and Highways',
        division: 'Materials Testing & Quality Assurance Division',
        province: 'National Capital District',
        district: 'Port Moresby',
        email: 'materials.lab@dow.gov.pg',
        sampleIdPrefix: 'DOW',
        reportIdPrefix: 'REP',
        isActive: true,
      },
    });
    console.log(`🏢 Created laboratory organization: ${lab.name}`);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(targetPassword, salt);

  const existing = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        isActive: true,
        emailVerified: true,
        laboratoryId: lab.id,
        role: targetRole,
      },
    });
    console.log(`✅ Successfully reset password for existing development account: ${targetEmail} (Role: ${targetRole})`);
  } else {
    const isWorker = targetRole === 'lab_worker';
    await prisma.user.create({
      data: {
        id: uuidv4(),
        email: targetEmail,
        passwordHash,
        firstName: isWorker ? 'Shared' : targetRole === 'system_admin' ? 'System' : 'Laboratory',
        lastName: isWorker ? 'Workstation' : targetRole === 'system_admin' ? 'Administrator' : 'Manager',
        role: targetRole,
        isActive: true,
        emailVerified: true,
        laboratoryId: lab.id,
      },
    });
    console.log(`✅ Successfully created designated development account: ${targetEmail} (Role: ${targetRole})`);
  }
}

resetDevAccount()
  .catch((err) => {
    console.error('❌ Failed to reset development account:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

