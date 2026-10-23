import { isAllowedOrigin } from './src/index.js';
import { setlistController } from './src/modules/setlists/controllers/setlist.controller.js';
import { setlistRepository } from './src/modules/setlists/repository/setlist.repository.js';
import { songRepository } from './src/modules/songs/repository/song.repository.js';
import { AppError } from './src/modules/common/utils/app_error.js';
import backupRouter from './src/modules/backup/routes/backup.routes.js';
import express from 'express';

async function runStage4Tests() {
  console.log('🔒 Running WorshipFlow Stage 4: Security, Reliability & API Safety Tests...\n');

  // =========================================================================
  // Test Suite 1: CORS & Origin Validation (RFC 1918 Private LAN + Localhost)
  // =========================================================================
  console.log('1. Testing isAllowedOrigin() CORS Validation...');

  // Allowed origins
  const allowedTestCases = [
    { origin: undefined, desc: 'Non-browser / same-origin request (undefined)' },
    { origin: 'http://localhost:5173', desc: 'Vite dev server default (localhost:5173)' },
    { origin: 'http://localhost:3000', desc: 'Alternative port on localhost' },
    { origin: 'http://127.0.0.1:5173', desc: 'IPv4 loopback (127.0.0.1:5173)' },
    { origin: 'http://192.168.1.105:5173', desc: 'Private 192.168.0.0/16 LAN client' },
    { origin: 'http://192.168.0.1:3000', desc: 'Private 192.168.0.0/16 router/gateway' },
    { origin: 'http://10.0.0.50:5173', desc: 'Private 10.0.0.0/8 enterprise/church LAN' },
    { origin: 'http://172.16.1.20:5173', desc: 'Private 172.16.0.0/12 subnet' },
    { origin: 'http://172.31.255.1:5173', desc: 'Private 172.31.x.x boundary subnet' },
  ];

  for (const { origin, desc } of allowedTestCases) {
    if (!isAllowedOrigin(origin)) {
      throw new Error(`Expected origin '${origin}' (${desc}) to be allowed, but it was rejected.`);
    }
    console.log(`   ✅ Allowed: ${desc}`);
  }

  // Blocked / Disallowed origins
  const blockedTestCases = [
    { origin: 'http://malicious-site.com', desc: 'Public arbitrary domain' },
    { origin: 'https://evil-hacker.org', desc: 'HTTPS malicious web origin' },
    { origin: 'http://8.8.8.8:5173', desc: 'Public Internet IP address (Google DNS)' },
    { origin: 'http://172.32.0.1:5173', desc: 'Public IP outside 172.16.0.0/12 range (172.32.x)' },
    { origin: 'http://192.169.1.1:5173', desc: 'Public IP outside 192.168.0.0/16 range' },
  ];

  for (const { origin, desc } of blockedTestCases) {
    if (isAllowedOrigin(origin)) {
      throw new Error(`Expected origin '${origin}' (${desc}) to be blocked, but it was allowed.`);
    }
    console.log(`   ✅ Blocked: ${desc}`);
  }

  // =========================================================================
  // Test Suite 2: Setlist Controller Safe 404 Handling & FK Protection
  // =========================================================================
  console.log('\n2. Testing Setlist Controller Safety & Clean 404 Responses...');

  // Helper mock request and next function
  function createMockReqRes(params: any = {}, body: any = {}) {
    let capturedStatus = 200;
    let capturedBody: any = null;
    let capturedError: any = null;

    const req: any = { params, body };
    const res: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedBody = data;
        return this;
      },
      send() {
        return this;
      },
    };
    const next = (err?: any) => {
      capturedError = err;
    };

    return { req, res, next, getStatus: () => capturedStatus, getBody: () => capturedBody, getError: () => capturedError };
  }

  // Test 2a: Non-existent setlist delete returns 404
  const mockDelete = createMockReqRes({ id: '9999999' });
  await setlistController.delete(mockDelete.req, mockDelete.res, mockDelete.next);
  const deleteErr = mockDelete.getError();
  if (!deleteErr || !(deleteErr instanceof AppError) || deleteErr.statusCode !== 404) {
    throw new Error(`Expected delete of non-existent setlist to throw 404 AppError, got: ${deleteErr?.message || deleteErr}`);
  }
  console.log('   ✅ Delete non-existent setlist returns clean 404 AppError');

  // Test 2b: Non-existent setlist addSong returns 404
  const mockAddNonExistentSetlist = createMockReqRes({ id: '9999999' }, { songId: 1, transposeOffset: 0 });
  await setlistController.addSong(mockAddNonExistentSetlist.req, mockAddNonExistentSetlist.res, mockAddNonExistentSetlist.next);
  const addErr1 = mockAddNonExistentSetlist.getError();
  if (!addErr1 || !(addErr1 instanceof AppError) || addErr1.statusCode !== 404) {
    throw new Error(`Expected addSong with non-existent setlist to return 404 AppError, got: ${addErr1?.message}`);
  }
  console.log('   ✅ addSong with non-existent setlist returns clean 404 AppError');

  // Test 2c: Existing setlist + non-existent song returns 404 (FK protection)
  // Create a temporary setlist first
  const tempSetlist = await setlistRepository.create({
    name: '__temp_qa_stage4_test_setlist__',
    description: 'Temporary setlist for testing FK protection',
  });

  try {
    const mockAddNonExistentSong = createMockReqRes({ id: String(tempSetlist.id) }, { songId: 9999999, transposeOffset: 0 });
    await setlistController.addSong(mockAddNonExistentSong.req, mockAddNonExistentSong.res, mockAddNonExistentSong.next);
    const addErr2 = mockAddNonExistentSong.getError();
    if (!addErr2 || !(addErr2 instanceof AppError) || addErr2.statusCode !== 404) {
      throw new Error(`Expected addSong with non-existent song to return 404 AppError, got: ${addErr2?.message}`);
    }
    console.log('   ✅ addSong with non-existent song returns clean 404 AppError (FK violation prevented)');

    // Test 2d: Non-existent setlist removeSong returns 404
    const mockRemoveNonExistentSetlist = createMockReqRes({ id: '9999999', songId: '1' });
    await setlistController.removeSong(mockRemoveNonExistentSetlist.req, mockRemoveNonExistentSetlist.res, mockRemoveNonExistentSetlist.next);
    const removeErr = mockRemoveNonExistentSetlist.getError();
    if (!removeErr || !(removeErr instanceof AppError) || removeErr.statusCode !== 404) {
      throw new Error(`Expected removeSong on non-existent setlist to return 404, got: ${removeErr?.message}`);
    }
    console.log('   ✅ removeSong with non-existent setlist returns clean 404 AppError');

    // Test 2e: Non-existent setlist reorderSongs returns 404
    const mockReorderNonExistent = createMockReqRes({ id: '9999999' }, { songIds: [1] });
    await setlistController.reorderSongs(mockReorderNonExistent.req, mockReorderNonExistent.res, mockReorderNonExistent.next);
    const reorderErr = mockReorderNonExistent.getError();
    if (!reorderErr || !(reorderErr instanceof AppError) || reorderErr.statusCode !== 404) {
      throw new Error(`Expected reorderSongs on non-existent setlist to return 404, got: ${reorderErr?.message}`);
    }
    console.log('   ✅ reorderSongs with non-existent setlist returns clean 404 AppError');

  } finally {
    // Clean up temporary setlist
    await setlistRepository.delete(tempSetlist.id);
    console.log('   ✅ Cleaned up temporary test setlist.');
  }

  // =========================================================================
  // Test Suite 3: Backup Restore Payload Boundary & Size Protection
  // =========================================================================
  console.log('\n3. Testing Backup Restore Upper Boundary Validation...');

  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/backup', backupRouter);

  // Setup error middleware
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  });

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Test 3a: > 5000 songs rejected
    const oversizedSongs = Array.from({ length: 5001 }, (_, i) => ({ title: `Song ${i}`, content: 'Verse 1' }));
    const resOversizedSongs = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: oversizedSongs }),
    });
    const bodyOversizedSongs = await resOversizedSongs.json() as any;
    if (resOversizedSongs.status !== 400 || !bodyOversizedSongs.message.includes('5,000 songs')) {
      throw new Error(`Expected 400 with 5,000 songs message, got: ${resOversizedSongs.status} ${JSON.stringify(bodyOversizedSongs)}`);
    }
    console.log('   ✅ Restore payload with > 5,000 songs rejected with 400 Bad Request');

    // Test 3b: > 1000 labels rejected
    const oversizedLabels = Array.from({ length: 1001 }, (_, i) => ({ name: `Label ${i}` }));
    const resOversizedLabels = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: [], labels: oversizedLabels }),
    });
    const bodyOversizedLabels = await resOversizedLabels.json() as any;
    if (resOversizedLabels.status !== 400 || !bodyOversizedLabels.message.includes('1,000 labels')) {
      throw new Error(`Expected 400 with 1,000 labels message, got: ${resOversizedLabels.status} ${JSON.stringify(bodyOversizedLabels)}`);
    }
    console.log('   ✅ Restore payload with > 1,000 labels rejected with 400 Bad Request');

    // Test 3c: > 500 setlists rejected
    const oversizedSetlists = Array.from({ length: 501 }, (_, i) => ({ name: `Setlist ${i}` }));
    const resOversizedSetlists = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: [], setlists: oversizedSetlists }),
    });
    const bodyOversizedSetlists = await resOversizedSetlists.json() as any;
    if (resOversizedSetlists.status !== 400 || !bodyOversizedSetlists.message.includes('500 setlists')) {
      throw new Error(`Expected 400 with 500 setlists message, got: ${resOversizedSetlists.status} ${JSON.stringify(bodyOversizedSetlists)}`);
    }
    console.log('   ✅ Restore payload with > 500 setlists rejected with 400 Bad Request');

  } finally {
    server.close();
  }

  console.log('\n🎉 ALL STAGE 4 SECURITY, RELIABILITY & SAFETY TESTS PASSED! 🎉');
  process.exit(0);
}

runStage4Tests().catch((err) => {
  console.error('\n❌ Stage 4 Test Failed:', err);
  process.exit(1);
});
