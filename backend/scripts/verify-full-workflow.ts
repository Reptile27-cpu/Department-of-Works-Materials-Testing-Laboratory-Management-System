import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api/v1';

async function runVerification() {
  console.log('🚀 Starting DoW Full End-to-End Workflow Verification...');

  // 1. Client Login
  console.log('\n--- STEP 1: Client Authentication ---');
  const clientLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'client@highlands.com.pg',
    password: 'Password123!',
  });
  const clientToken = clientLoginRes.data.data.accessToken;
  const clientUser = clientLoginRes.data.data.user;
  console.log(`✅ Client authenticated: ${clientUser.firstName} ${clientUser.lastName} (Role: ${clientUser.role})`);

  // 2. Fetch catalogue to get testTypeIds
  const catRes = await axios.get(`${BASE_URL}/requests/public/categories`);
  const categories = catRes.data.data.categories;
  const allTests = Object.values(categories).flat() as any[];
  const selectedTestIds = allTests.slice(0, 2).map((t: any) => t.id);
  console.log(`✅ Selected test types from catalogue: ${allTests.slice(0, 2).map((t: any) => t.name).join(', ')}`);

  // 3. Client Submits Request (Form RQ-LT)
  console.log('\n--- STEP 2: Client Submits Testing Request (Form RQ-LT) ---');
  const requestPayload = {
    clientName: 'Highlands Highway JV Contractors',
    projectName: 'Highlands Highway Section 4B Culvert Works',
    projectLocation: 'Kassam Pass Chainage 24+500',
    location: 'Kassam Pass Chainage 24+500',
    materialType: 'Subbase Coarse Aggregate 20mm',
    sampleCategory: 'Aggregates',
    sampleDescription: 'Coarse aggregate sample for Los Angeles abrasion and gradation testing.',
    materialSource: 'Markham River Quarry Bed',
    sampleQuantity: '2 bags (50kg)',
    samplingDepth: 'Stockpile face 1.0m',
    dateSampled: '2026-10-07',
    sampledBy: 'T. Kaupa (Field Tech)',
    priority: 'normal',
    testTypeIds: selectedTestIds,
    remarks: 'Required for culvert bed compliance sign-off.',
  };

  const createReqRes = await axios.post(`${BASE_URL}/requests`, requestPayload, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const createdRequest = createReqRes.data.data;
  console.log(`✅ Request submitted successfully! Reference: ${createdRequest.requestNumber} (ID: ${createdRequest.id})`);
  console.log(`   Estimated Cost: PGK K${createdRequest.estimatedCost} | Status: ${createdRequest.status}`);

  // 4. Verify Client Request List Isolation
  console.log('\n--- STEP 3: Client Verifies Their Request In List ---');
  const clientListRes = await axios.get(`${BASE_URL}/requests`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const myRequests = clientListRes.data.data;
  const foundInList = myRequests.find((r: any) => r.id === createdRequest.id);
  if (!foundInList) {
    throw new Error('Newly created request not found in client request list!');
  }
  console.log(`✅ Found request ${foundInList.requestNumber} in client requests list (Total client requests: ${myRequests.length})`);

  // 5. Lab Manager Login
  console.log('\n--- STEP 4: Lab Manager Reviews Intake Queue ---');
  const managerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'manager@dow.gov.pg',
    password: 'Password123!',
  });
  const managerToken = managerLoginRes.data.data.accessToken;
  const managerUser = managerLoginRes.data.data.user;
  console.log(`✅ Lab Manager authenticated: ${managerUser.firstName} ${managerUser.lastName} (Role: ${managerUser.role})`);

  // 6. Lab Manager Evaluates Request (Technical Form RR)
  console.log('\n--- STEP 5: Lab Manager Conducts Technical Evaluation ---');
  const evalRes = await axios.post(
    `${BASE_URL}/requests/${createdRequest.id}/evaluate`,
    {
      decision: 'approved',
      methodAvailable: true,
      equipmentAvailable: true,
      turnaroundFeasible: true,
      comments: 'All requested test standards (AS 1289) and calibrated equipment verified ready. Approved for specimen intake.',
    },
    { headers: { Authorization: `Bearer ${managerToken}` } }
  );
  console.log(`✅ Technical Evaluation completed. Request Status: ${evalRes.data.data.status}`);

  // 7. Lab Manager Intakes Specimen & Assigns Technician
  console.log('\n--- STEP 6: Lab Manager Intakes Specimen & Assigns Testing Technician ---');
  // Get technicians list
  const usersRes = await axios.get(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const tech = usersRes.data.data.find((u: any) => u.email === 'tech@dow.gov.pg');
  if (!tech) throw new Error('Technician tech@dow.gov.pg not found!');
  console.log(`   Assigning to Technician: ${tech.firstName} ${tech.lastName} (${tech.email})`);

  const intakeRes = await axios.post(
    `${BASE_URL}/requests/${createdRequest.id}/convert-to-sample`,
    {
      technicianId: tech.id,
      condition: 'intact',
      storageLocation: 'Aggregates Bay 2',
      dueDate: '2026-10-15',
      remarks: 'Specimen delivered in sealed bag. Priority normal.',
    },
    { headers: { Authorization: `Bearer ${managerToken}` } }
  );
  const sampleData = intakeRes.data.data.sample;
  const createdTests = intakeRes.data.data.tests;
  console.log(`✅ Specimen Intaked!`);
  console.log(`   Sample ID: ${sampleData.id}`);
  console.log(`   Sample Number: ${sampleData.sampleNumber}`);
  console.log(`   QR Token: ${sampleData.qrToken}`);
  console.log(`   Tests Created: ${createdTests.length}`);
  console.log(`   Assigned Technician ID: ${sampleData.assignedTechnicianId}`);

  // 8. Technician Login & Verification of Assigned Work
  console.log('\n--- STEP 7: Technician Checks Work Queue ---');
  const techLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'tech@dow.gov.pg',
    password: 'Password123!',
  });
  const techToken = techLoginRes.data.data.accessToken;
  const techUser = techLoginRes.data.data.user;
  console.log(`✅ Technician authenticated: ${techUser.firstName} ${techUser.lastName} (Role: ${techUser.role})`);

  // Query technician's assigned samples
  const techSamplesRes = await axios.get(`${BASE_URL}/samples?assignedTechnicianId=${tech.id}`, {
    headers: { Authorization: `Bearer ${techToken}` },
  });
  const techSamples = techSamplesRes.data.data;
  const assignedSample = techSamples.find((s: any) => s.id === sampleData.id);
  if (!assignedSample) {
    throw new Error('Assigned sample not found in technician sample queue!');
  }
  console.log(`✅ Technician verified sample ${assignedSample.sampleNumber} in assigned samples queue!`);

  // Query test worksheets
  const techTestsRes = await axios.get(`${BASE_URL}/tests?sampleId=${sampleData.id}`, {
    headers: { Authorization: `Bearer ${techToken}` },
  });
  console.log(`✅ Found ${techTestsRes.data.data.length} test worksheets created for sample ${assignedSample.sampleNumber}!`);

  console.log('\n🎉 ALL WORKFLOW STEPS VERIFIED END-TO-END WITH 100% SUCCESS!');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err.response?.data || err.message);
  process.exit(1);
});

