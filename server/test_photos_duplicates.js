import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { validateImageBuffer } from './lib/fileValidation.js';
import { calculateDistanceMeters, findPotentialDuplicates } from './lib/duplicateDetection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

console.log('=== FEATURE 3 TEST SUITE: PHOTO EVIDENCE & DUPLICATE DETECTION ===\n');

// 1. Binary Magic Numbers & File Validation Tests
// Valid 1x1 Transparent PNG
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);
const validPngResult = validateImageBuffer(validPngBuffer);
assert.strictEqual(validPngResult.valid, true);
assert.strictEqual(validPngResult.mimeType, 'image/png');
console.log('[Test 1: Valid PNG Signature] PASSED');

// Valid minimal JPEG
const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const validJpgResult = validateImageBuffer(validJpgBuffer);
assert.strictEqual(validJpgResult.valid, true);
assert.strictEqual(validJpgResult.mimeType, 'image/jpeg');
console.log('[Test 2: Valid JPEG Signature] PASSED');

// Fake file: text file disguised as .jpg
const spoofedBuffer = Buffer.from('GIF89a this is actually not a valid jpeg or png file');
const spoofedResult = validateImageBuffer(spoofedBuffer);
assert.strictEqual(spoofedResult.valid, false);
assert.ok(spoofedResult.error.includes('Unsupported or corrupted image format'));
console.log('[Test 3: Extension spoofing / malformed binary rejected] PASSED');

// Empty file (0 bytes)
const emptyBuffer = Buffer.alloc(0);
const emptyResult = validateImageBuffer(emptyBuffer);
assert.strictEqual(emptyResult.valid, false);
console.log('[Test 4: Empty file (0 bytes) rejected] PASSED');

// 2. Haversine Spatial Distance & Duplicate Calculation Tests
// Vadodara Station (22.3106, 73.1812) to Alkapuri Underpass (22.3110, 73.1795) (~180m)
const distNearby = calculateDistanceMeters(22.3106, 73.1812, 22.3110, 73.1795);
assert.ok(distNearby < 300, `Expected distance <300m, got ${distNearby}m`);
console.log(`[Test 5: Haversine distance nearby] PASSED (${distNearby} meters)`);

// Vadodara to Ahmedabad (~100km = 100,000m)
const distDistant = calculateDistanceMeters(22.3106, 73.1812, 23.0225, 72.5714);
assert.ok(distDistant > 50000, `Expected distance >50,000m, got ${distDistant}m`);
console.log(`[Test 6: Haversine distance distant] PASSED (${Math.round(distDistant / 1000)} km)`);

// Duplicate detection with coordinates outside time window
const now = Date.now();
const mockList = [
  { id: 'rep-1', title: 'Nearby active flood', lat: 22.3108, lng: 73.1810, createdAt: new Date(now - 30 * 60 * 1000), status: 'Pending Crew' },
  { id: 'rep-2', title: 'Nearby but 8 hours old', lat: 22.3108, lng: 73.1810, createdAt: new Date(now - 8 * 60 * 60 * 1000), status: 'Pending Crew' },
  { id: 'rep-3', title: 'Distant flood', lat: 22.3500, lng: 73.2500, createdAt: new Date(now - 10 * 60 * 1000), status: 'Pending Crew' }
];

const foundDups = findPotentialDuplicates(mockList, { lat: 22.3106, lng: 73.1812, timeWindowHours: 4, maxDistanceMeters: 300 });
assert.strictEqual(foundDups.length, 1);
assert.strictEqual(foundDups[0].id, 'rep-1');
console.log('[Test 7: Spatial & temporal window filtering] PASSED');

// Duplicate check handling missing coordinates gracefully
const emptyDups = findPotentialDuplicates(mockList, { lat: null, lng: undefined });
assert.strictEqual(emptyDups.length, 0);
console.log('[Test 8: Missing coordinates handled gracefully without crash] PASSED');

// 3. Live End-to-End API Photo Upload & Duplicate Integration Tests
async function runApiTests() {
  const ts = Date.now();
  const citizenEmail = `photo_cit_${ts}@floodsignal.local`;
  const citizenPassword = `PhotoPass_${ts}!Safe`;

  // Register citizen
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Photo Tester ${ts}`, email: citizenEmail, password: citizenPassword })
  });
  assert.strictEqual(regRes.status, 201);
  const citizenCookie = regRes.headers.get('set-cookie')?.split(';')[0];

  // 1. Submit report with valid photo attachment
  const photoPayload = {
    title: `[F3-PHOTO-${ts}] Flood with Photographic Evidence`,
    description: 'Attached high-resolution waterlogging observation photo',
    lat: 22.3075,
    lng: 73.1815,
    depth: 55,
    severity: 'high',
    roadBlocked: true,
    criticalFacility: false,
    photos: [{
      name: 'substation_water.png',
      dataBase64: validPngBuffer.toString('base64')
    }]
  };

  const uploadRes = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify(photoPayload)
  });
  assert.strictEqual(uploadRes.status, 201);
  const createdReport = await uploadRes.json();
  const reportId = createdReport.id || createdReport._id;

  assert.strictEqual(createdReport.photos.length, 1);
  assert.ok(createdReport.photos[0].key.endsWith('.png'));
  console.log('[Test 9: Photo upload persistence & metadata attribution] PASSED');

  // 2. Retrieve photo stream through protected API
  const photoKey = createdReport.photos[0].key;
  const getPhotoRes = await fetch(`${BASE_URL}/reports/${reportId}/photos/${photoKey}`, {
    headers: { 'Cookie': citizenCookie }
  });
  assert.strictEqual(getPhotoRes.status, 200);
  assert.strictEqual(getPhotoRes.headers.get('content-type'), 'image/png');
  const photoBytes = await getPhotoRes.arrayBuffer();
  assert.strictEqual(photoBytes.byteLength, validPngBuffer.length);
  console.log('[Test 10: Secure photo stream retrieval] PASSED');

  // 3. Unauthorized access check (without auth cookie)
  const unauthPhotoRes = await fetch(`${BASE_URL}/reports/${reportId}/photos/${photoKey}`);
  assert.strictEqual(unauthPhotoRes.status, 401);
  console.log('[Test 11: Unauthorized photo access blocked (401)] PASSED');

  // 4. Exceed maximum photo count (>3 photos rejected)
  const tooManyPhotosRes = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify({
      title: 'Too Many Photos Report',
      description: 'Attempting 4 photos',
      lat: 22.3075, lng: 73.1815, depth: 30, severity: 'low',
      photos: [
        { name: '1.png', dataBase64: validPngBuffer.toString('base64') },
        { name: '2.png', dataBase64: validPngBuffer.toString('base64') },
        { name: '3.png', dataBase64: validPngBuffer.toString('base64') },
        { name: '4.png', dataBase64: validPngBuffer.toString('base64') }
      ]
    })
  });
  assert.strictEqual(tooManyPhotosRes.status, 400);
  console.log('[Test 12: File count limit (>3) enforced] PASSED');

  // 5. Test check-duplicates endpoint for nearby coordinates
  const checkDupRes = await fetch(`${BASE_URL}/reports/check-duplicates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify({ lat: 22.3076, lng: 73.1816 }) // within 30m of createdReport
  });
  assert.strictEqual(checkDupRes.status, 200);
  const dupCheckData = await checkDupRes.json();
  assert.ok(Array.isArray(dupCheckData.potentialDuplicates));
  const foundCreated = dupCheckData.potentialDuplicates.find(d => d.id === reportId);
  assert.ok(foundCreated, 'Expected newly created report to be flagged as potential duplicate');
  assert.ok(foundCreated.distanceMeters < 50);
  console.log(`[Test 13: Live duplicate endpoint finds nearby report (${foundCreated.distanceMeters}m away)] PASSED`);

  // 6. Citizen proceeds with submission despite duplicate -> saved with potentialDuplicateOf flag
  const duplicateProceedPayload = {
    title: `[F3-PROCEED-${ts}] Verified distinct observation near same spot`,
    description: 'Second report explicitly acknowledged duplicate warning',
    lat: 22.3076,
    lng: 73.1816,
    depth: 60,
    severity: 'high'
  };
  const proceedRes = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': citizenCookie },
    body: JSON.stringify(duplicateProceedPayload)
  });
  assert.strictEqual(proceedRes.status, 201);
  const proceedData = await proceedRes.json();
  assert.strictEqual(proceedData.isFlaggedDuplicate, true);
  assert.ok(proceedData.potentialDuplicateOf.includes(reportId));
  console.log('[Test 14: Citizen proceeds; report created with duplicate flag rather than deleted] PASSED');

  // 7. Unit Tests for S3StorageDriver with Mock Client (Testing S3 save, read, delete, failure paths)
  const { S3StorageDriver } = await import('./lib/storage.js');
  const mockS3Store = new Map();
  const mockS3Client = {
    async send(command) {
      const input = command.input || {};
      if (input.Bucket !== 'test-prod-bucket') {
        throw new Error('S3 Access Denied: Invalid bucket');
      }
      if (input.Body) {
        // Put / Upload
        mockS3Store.set(input.Key, input.Body);
        return { $metadata: { httpStatusCode: 200 } };
      }
      if (command.isDelete || command.action === 'delete') {
        mockS3Store.delete(input.Key);
        return { $metadata: { httpStatusCode: 204 } };
      }
      // Get / Read
      if (!mockS3Store.has(input.Key)) {
        const err = new Error('NoSuchKey');
        err.name = 'NoSuchKey';
        throw err;
      }
      return { Body: mockS3Store.get(input.Key) };
    },
    async deleteObject(params) {
      mockS3Store.delete(params.Key);
      return { $metadata: { httpStatusCode: 204 } };
    }
  };

  const s3Driver = new S3StorageDriver({
    bucketName: 'test-prod-bucket',
    region: 'us-east-1',
    s3Client: mockS3Client
  });

  // Test S3 save
  const s3Saved = await s3Driver.save({
    buffer: validPngBuffer,
    originalName: 'evidence.png',
    mimeType: 'image/png'
  });
  assert.strictEqual(s3Saved.storageProvider, 's3');
  assert.strictEqual(s3Saved.bucket, 'test-prod-bucket');
  assert.ok(s3Saved.key.startsWith('reports/'));
  assert.ok(mockS3Store.has(s3Saved.key));

  // Test S3 read
  const s3ReadStream = await s3Driver.getReadStream(s3Saved.key);
  assert.deepStrictEqual(s3ReadStream, validPngBuffer);

  // Test S3 delete (cleanup path)
  await s3Driver.delete(s3Saved.key);
  assert.strictEqual(mockS3Store.has(s3Saved.key), false);

  // Test S3 failure path (NoSuchKey)
  let s3ReadError = null;
  try {
    await s3Driver.getReadStream('reports/nonexistent.png');
  } catch (err) {
    s3ReadError = err;
  }
  assert.ok(s3ReadError, 'Expected NoSuchKey error on nonexistent S3 item');
  console.log('[Test 15: S3 storage driver upload, read, cleanup, and failure paths] PASSED');

  console.log('\n=== ALL 15 FEATURE 3 TESTS PASSED ===');
}

runApiTests().catch(err => {
  console.error('Feature 3 Tests Failed:', err);
  process.exit(1);
});
