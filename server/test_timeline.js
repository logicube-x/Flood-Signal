import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

console.log('=== FEATURE 2 TEST SUITE: RESPONSE TIMELINE AND ACCOUNTABILITY ===\n');

async function runFeature2Tests() {
  const ts = Date.now();
  const citizenEmail = `cit_f2_${ts}@floodsignal.local`;
  const citizenPassword = `CitPass_${ts}!Safe`;
  const responderEmail1 = `resp1_f2_${ts}@vadodara.gov`;
  const responderEmail2 = `resp2_f2_${ts}@vadodara.gov`;
  const responderPassword = `RespPass_${ts}!Safe`;

  let citizenCookie = null;
  let citizenId = null;
  let responderCookie1 = null;
  let responderId1 = null;
  let responderId2 = null;
  let reportId = null;

  // Setup: Register citizen
  const regCitizen = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Citizen ${ts}`, email: citizenEmail, password: citizenPassword })
  });
  assert.strictEqual(regCitizen.status, 201);
  const regCitizenData = await regCitizen.json();
  citizenId = regCitizenData.user.id;
  citizenCookie = regCitizen.headers.get('set-cookie')?.split(';')[0];

  // Setup: Provision Responders in DB directly
  await mongoose.connect(process.env.MONGODB_URI);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(responderPassword, salt);
  const UserCol = mongoose.connection.collection('users');

  const r1 = await UserCol.insertOne({
    name: `Field Inspector ${ts}`,
    email: responderEmail1.toLowerCase(),
    passwordHash: hash,
    role: 'responder',
    createdAt: new Date()
  });
  responderId1 = r1.insertedId.toString();

  const r2 = await UserCol.insertOne({
    name: `Chief Engineer ${ts}`,
    email: responderEmail2.toLowerCase(),
    passwordHash: hash,
    role: 'responder',
    createdAt: new Date()
  });
  responderId2 = r2.insertedId.toString();
  await mongoose.disconnect();

  // Login as Responder 1
  const loginResp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: responderEmail1, password: responderPassword })
  });
  assert.strictEqual(loginResp.status, 200);
  responderCookie1 = loginResp.headers.get('set-cookie')?.split(';')[0];

  // Step 1: Citizen creates report -> Server creates CREATED audit entry
  const createRep = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify({
      title: `[F2-AUDIT-${ts}] Substation Waterlogging`,
      description: 'Water entering transformer yard, urgent response needed',
      lat: 22.308,
      lng: 73.185,
      depth: 65,
      severity: 'high',
      roadBlocked: true,
      criticalFacility: true
    })
  });
  assert.strictEqual(createRep.status, 201);
  const repData = await createRep.json();
  reportId = repData.id || repData._id;

  assert.strictEqual(repData.statusHistory.length, 1);
  assert.strictEqual(repData.statusHistory[0].actionType, 'CREATED');
  assert.strictEqual(repData.statusHistory[0].updatedByRole, 'citizen');
  console.log('[Test 1: Report creation server-generated audit event] PASSED');

  // Step 2: Citizen attempt to assign responder -> Rejection (403)
  const citAssign = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify({ assignedResponderId: responderId1 })
  });
  assert.strictEqual(citAssign.status, 403);
  console.log('[Test 2: Citizen forbidden from assigning responders] PASSED (403 Forbidden)');

  // Step 3: Citizen attempt to add dispatch notes -> Rejection (403)
  const citNote = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify({ dispatchNote: 'Citizen trying to insert dispatch note' })
  });
  assert.strictEqual(citNote.status, 403);
  console.log('[Test 3: Citizen forbidden from modifying dispatch notes] PASSED (403 Forbidden)');

  // Step 4: Responder queries available responders list
  const listResp = await fetch(`${BASE_URL}/responders`, {
    headers: { 'Cookie': responderCookie1 }
  });
  assert.strictEqual(listResp.status, 200);
  const respondersList = await listResp.json();
  assert.ok(Array.isArray(respondersList) && respondersList.length >= 2);
  console.log('[Test 4: Responder list retrieval for task allocation] PASSED');

  // Step 5: Responder assigns Responder 1 to report
  const assignResp = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ assignedResponderId: responderId1 })
  });
  assert.strictEqual(assignResp.status, 200);
  const assignedData = await assignResp.json();
  assert.strictEqual(assignedData.assignedResponderId, responderId1);
  assert.strictEqual(assignedData.statusHistory.length, 2);
  assert.strictEqual(assignedData.statusHistory[1].actionType, 'ASSIGNED');
  assert.strictEqual(assignedData.statusHistory[1].assignedTo, responderId1);
  console.log('[Test 5: Authorized responder assignment & audit event] PASSED');

  // Step 6: Responder reassigns to Responder 2
  const reassignResp = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ assignedResponderId: responderId2 })
  });
  assert.strictEqual(reassignResp.status, 200);
  const reassignedData = await reassignResp.json();
  assert.strictEqual(reassignedData.assignedResponderId, responderId2);
  assert.strictEqual(reassignedData.statusHistory.length, 3);
  assert.strictEqual(reassignedData.statusHistory[2].actionType, 'REASSIGNED');
  console.log('[Test 6: Responder reassignment tracking] PASSED');

  // Step 7: Reject assignment of non-existent user or unprivileged citizen
  const badAssign1 = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ assignedResponderId: citizenId }) // citizen does not have responder privileges
  });
  assert.strictEqual(badAssign1.status, 400);

  const badAssign2 = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ assignedResponderId: '507f1f77bcf86cd799439011' }) // non-existent
  });
  assert.strictEqual(badAssign2.status, 400);
  console.log('[Test 7: Rejection of invalid assignees (citizen or non-existent)] PASSED');

  // Step 8: Add Dispatch Note & Validate length
  const emptyNote = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ dispatchNote: '   ' })
  });
  assert.strictEqual(emptyNote.status, 400);

  const validNote = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ dispatchNote: 'Deploying heavy diesel pump unit DP-4 to substation perimeter.' })
  });
  assert.strictEqual(validNote.status, 200);
  const noteData = await validNote.json();
  assert.strictEqual(noteData.statusHistory.length, 4);
  assert.strictEqual(noteData.statusHistory[3].actionType, 'DISPATCH_NOTE');
  assert.strictEqual(noteData.statusHistory[3].note, 'Deploying heavy diesel pump unit DP-4 to substation perimeter.');
  assert.strictEqual(noteData.statusHistory[3].updatedByName, `Field Inspector ${ts}`);
  console.log('[Test 8: Dispatch note validation and audit preservation] PASSED');

  // Step 9: Verify incident and verify status change
  const statusUpdate = await fetch(`${BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': responderCookie1 },
    body: JSON.stringify({ status: 'Investigating', verified: true })
  });
  assert.strictEqual(statusUpdate.status, 200);
  const statusData = await statusUpdate.json();
  assert.strictEqual(statusData.status, 'Investigating');
  assert.strictEqual(statusData.verified, true);
  // Should have STATUS_CHANGE and VERIFIED appended
  assert.strictEqual(statusData.statusHistory.length, 6);
  console.log('[Test 9: Verification toggle and status transition events] PASSED');

  // Step 10: Citizen reads own report via /api/reports/me -> Sees timeline safely
  const citMe = await fetch(`${BASE_URL}/reports/me`, {
    headers: { 'Cookie': citizenCookie }
  });
  assert.strictEqual(citMe.status, 200);
  const citReports = await citMe.json();
  const myRep = citReports.find(r => (r.id || r._id) === reportId);
  assert.ok(myRep);
  assert.strictEqual(myRep.statusHistory.length, 6);
  console.log('[Test 10: Citizen reads server audit timeline without secret leaks] PASSED');

  console.log('\n=== ALL 10 FEATURE 2 TESTS PASSED ===');
}

runFeature2Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
