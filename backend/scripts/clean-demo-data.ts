import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDemoData() {
  console.log('===============================================================');
  console.log('   DOW MATERIALS TESTING LABORATORY — CLEANING DEMO DATA       ');
  console.log('===============================================================\n');

  console.log('1. Removing transactional test data...');
  const deletedMeasurements = await prisma.measurement.deleteMany({});
  console.log(`   - Deleted ${deletedMeasurements.count} measurements.`);

  const deletedLabTests = await prisma.labTest.deleteMany({});
  console.log(`   - Deleted ${deletedLabTests.count} lab tests.`);

  const deletedReports = await prisma.testReport.deleteMany({});
  console.log(`   - Deleted ${deletedReports.count} test reports.`);

  console.log('\n2. Removing sample custody and tracking records...');
  const deletedStatusHistories = await prisma.sampleStatusHistory.deleteMany({});
  console.log(`   - Deleted ${deletedStatusHistories.count} sample status histories.`);

  const deletedSamples = await prisma.sample.deleteMany({});
  console.log(`   - Deleted ${deletedSamples.count} samples.`);

  console.log('\n3. Removing quotation records...');
  const deletedQuotationItems = await prisma.quotationItem.deleteMany({});
  console.log(`   - Deleted ${deletedQuotationItems.count} quotation items.`);

  const deletedQuotations = await prisma.quotation.deleteMany({});
  console.log(`   - Deleted ${deletedQuotations.count} quotations.`);

  console.log('\n4. Removing testing requests and intake submissions...');
  const deletedRequestItems = await prisma.testingRequestItem.deleteMany({});
  console.log(`   - Deleted ${deletedRequestItems.count} request items.`);

  const deletedRequests = await prisma.testingRequest.deleteMany({});
  console.log(`   - Deleted ${deletedRequests.count} testing requests.`);

  console.log('\n5. Removing demo projects and client records...');
  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`   - Deleted ${deletedProjects.count} projects.`);

  const deletedClients = await prisma.client.deleteMany({});
  console.log(`   - Deleted ${deletedClients.count} client organizations.`);

  console.log('\n6. Clearing notifications and transactional audit logs...');
  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`   - Deleted ${deletedNotifications.count} notifications.`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`   - Deleted ${deletedAuditLogs.count} audit logs.`);

  console.log('\n7. Safely removing demo users and worker identities...');
  // Preserve ONLY manager@dow.gov.pg and the shared terminal labworker@dow.gov.pg
  const keptEmails = ['manager@dow.gov.pg', 'labworker@dow.gov.pg'];
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { notIn: keptEmails },
    },
  });
  console.log(`   - Removed ${deletedUsers.count} demo users/worker records.`);

  console.log('\n8. Preserved System & Master Data:');
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  console.log('   - Authenticated Accounts Kept:');
  console.table(remainingUsers);

  const testTypesCount = await prisma.testType.count();
  console.log(`   - Preserved Test Types Catalogue: ${testTypesCount} test methods.`);

  const labsCount = await prisma.laboratory.count();
  console.log(`   - Preserved Laboratories: ${labsCount} laboratory facilities.`);

  const equipmentCount = await prisma.equipment.count();
  console.log(`   - Preserved Laboratory Equipment: ${equipmentCount} instruments.`);

  console.log('\n9. Final State Verification:');
  const finalCounts = {
    clients: await prisma.client.count(),
    testingRequests: await prisma.testingRequest.count(),
    quotations: await prisma.quotation.count(),
    samples: await prisma.sample.count(),
    labTests: await prisma.labTest.count(),
    reports: await prisma.testReport.count(),
    projects: await prisma.project.count(),
    notifications: await prisma.notification.count(),
    workerIdentities: await prisma.user.count({
      where: { role: { in: ['lab_technician', 'lab_engineer'] } },
    }),
    totalUsers: await prisma.user.count(),
  };
  console.table(finalCounts);

  console.log('\n===============================================================');
  console.log('   CLEANUP COMPLETE — CLEAN SYSTEM READY FOR NEW TEST          ');
  console.log('===============================================================\n');

  await prisma.$disconnect();
}

cleanDemoData().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

