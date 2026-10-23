import { app } from './src/index.js';
import { songRepository } from './src/modules/songs/repository/song.repository.js';
import { labelRepository } from './src/modules/labels/repository/label.repository.js';
import { setlistRepository } from './src/modules/setlists/repository/setlist.repository.js';
import http from 'http';

async function runBackupRestoreTests() {
  console.log('🧪 Starting WorshipFlow Stage 2: Backup Export & Restore Verification...\n');

  // Start temporary test server
  const server = http.createServer(app.getApp());
  const TEST_PORT = 3012;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  const baseUrl = `http://localhost:${TEST_PORT}/api`;

  const createdSongIds: number[] = [];
  const createdLabelIds: number[] = [];
  const createdSetlistIds: number[] = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Direct Repository Method & Signature Verifications (WF-QA-004 & WF-QA-005)
    // -------------------------------------------------------------------------
    console.log('1. Verifying repository method contracts and query parameters...');
    
    // Test songRepository.findAll with complete query contract
    const allSongs = await songRepository.findAll({
      page: 1,
      limit: 5000,
      sort: 'title',
      order: 'ASC',
      labelIds: [],
    });
    if (!Array.isArray(allSongs)) {
      throw new Error('songRepository.findAll did not return an array');
    }
    console.log(`   ✅ songRepository.findAll query contract validated (${allSongs.length} existing songs).`);

    // Test labelRepository.create with explicit instrument: null
    const tempLabel = await labelRepository.create({
      name: `TypeCheckLabel-${Date.now()}`,
      color: '#198754',
      instrument: null,
    });
    if (!tempLabel.id) throw new Error('labelRepository.create failed');
    createdLabelIds.push(tempLabel.id);
    console.log(`   ✅ labelRepository.create with instrument: null validated (ID: ${tempLabel.id}).`);

    // Test setlistRepository.addSong with explicit position & transposeOffset
    const tempSetlist = await setlistRepository.create({
      name: `TypeCheckSetlist-${Date.now()}`,
      description: 'Temporary setlist for testing addSong contract',
    });
    createdSetlistIds.push(tempSetlist.id);

    // Pick an existing song or create a temp song for testing
    let sampleSongId = allSongs[0]?.id;
    if (!sampleSongId) {
      const sampleSong = await songRepository.create({
        title: `TempSampleSong-${Date.now()}`,
        content: '[C]Hello [G]world',
      });
      sampleSongId = sampleSong.id;
      createdSongIds.push(sampleSongId);
    }

    await setlistRepository.addSong(tempSetlist.id, sampleSongId, 5, 42);
    const loadedSetlist = await setlistRepository.findById(tempSetlist.id);
    const addedItem = loadedSetlist?.songs.find((s) => s.song.id === sampleSongId);
    if (!addedItem || addedItem.position !== 42 || addedItem.transposeOffset !== 5) {
      throw new Error(`setlistRepository.addSong position/offset mismatch: ${JSON.stringify(addedItem)}`);
    }
    console.log('   ✅ setlistRepository.addSong 4-arg contract validated with explicit position and offset.');

    // -------------------------------------------------------------------------
    // 2. GET /api/backup — Export Full Library
    // -------------------------------------------------------------------------
    console.log('\n2. Testing GET /api/backup (Full Library Export)...');
    const exportRes = await fetch(`${baseUrl}/backup`);
    const exportJson = (await exportRes.json()) as any;
    if (!exportJson.success || !exportJson.data) {
      throw new Error(`Export failed: ${JSON.stringify(exportJson)}`);
    }
    const backup = exportJson.data;
    if (backup.format !== 'worshipflow-library' || backup.version !== 1) {
      throw new Error(`Invalid backup metadata: ${JSON.stringify(backup)}`);
    }
    if (!Array.isArray(backup.songs) || !Array.isArray(backup.labels) || !Array.isArray(backup.setlists)) {
      throw new Error('Exported backup missing songs, labels, or setlists arrays');
    }
    // Verify exported setlists contain full song details
    const exportedSetlistWithSongs = backup.setlists.find((s: any) => s.id === tempSetlist.id);
    if (!exportedSetlistWithSongs || !Array.isArray(exportedSetlistWithSongs.songs) || exportedSetlistWithSongs.songs.length === 0) {
      throw new Error('Exported setlist does not contain full songs array with positions');
    }
    console.log(`   ✅ Export verified: format="${backup.format}", counts: ${JSON.stringify(backup.counts)}`);
    console.log(`   ✅ Exported setlist contains full songs payload with positions and offsets.`);

    // -------------------------------------------------------------------------
    // 3. POST /api/backup/restore — Multi-Song, Multi-Setlist, Non-Default Ordering & Transpose
    // -------------------------------------------------------------------------
    console.log('\n3. Testing POST /api/backup/restore with full relationships...');
    const testTimestamp = Date.now();
    const songAlphaTitle = `Restore Test Alpha - ${testTimestamp}`;
    const songBetaTitle = `Restore Test Beta - ${testTimestamp}`;
    const testTagName = `RestoreTag-${testTimestamp}`;
    const setlistAlphaName = `Restore Service Alpha - ${testTimestamp}`;
    const setlistEmptyName = `Empty Service - ${testTimestamp}`;

    const testBackupPayload = {
      format: 'worshipflow-library',
      version: 1,
      exportedAt: new Date().toISOString(),
      labels: [
        {
          id: 991, // Virtual old ID
          name: testTagName,
          color: '#3b82f6',
          instrument: 'GUITAR',
        },
      ],
      songs: [
        {
          id: 881, // Virtual old ID
          title: songAlphaTitle,
          artist: 'Author Alpha',
          songKey: 'G',
          capo: 0,
          tempo: 75,
          difficulty: 'BEGINNER',
          content: '[G]Amazing [C]grace, how [D]sweet',
          notes: 'Alpha arrangement',
          labels: [{ id: 991, name: testTagName }],
        },
        {
          id: 882, // Virtual old ID
          title: songBetaTitle,
          artist: 'Author Beta',
          songKey: 'D',
          capo: 2,
          tempo: 128,
          difficulty: 'INTERMEDIATE',
          content: '[D]Praise the [G]Lord my [A]soul',
          notes: 'Beta arrangement',
          labels: [],
        },
      ],
      setlists: [
        {
          id: 771, // Virtual old ID
          name: setlistAlphaName,
          description: 'Setlist with non-default ordering and offsets',
          songs: [
            // Note: Song Beta is placed at position 0 with offset +3
            {
              songId: 882,
              position: 0,
              transposeOffset: 3,
            },
            // Note: Song Alpha is placed at position 1 with offset -2
            {
              songId: 881,
              position: 1,
              transposeOffset: -2,
            },
          ],
        },
        {
          id: 772, // Virtual old ID
          name: setlistEmptyName,
          description: 'Setlist with zero songs',
          songs: [],
        },
      ],
    };

    const restoreRes = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBackupPayload),
    });
    const restoreJson = (await restoreRes.json()) as any;
    if (!restoreJson.success) {
      throw new Error(`Restore failed: ${JSON.stringify(restoreJson)}`);
    }
    console.log(`   ✅ Restore endpoint returned success: "${restoreJson.message}"`);

    // Verify Song Alpha created with mapped label
    const restoredSongAlpha = await songRepository.findByTitle(songAlphaTitle);
    if (!restoredSongAlpha) throw new Error('Song Alpha was not found in DB after restore');
    createdSongIds.push(restoredSongAlpha.id);
    if (!restoredSongAlpha.labels.some((l) => l.name === testTagName)) {
      throw new Error(`Song Alpha missing restored label '${testTagName}'`);
    }
    const createdLabel = restoredSongAlpha.labels.find((l) => l.name === testTagName);
    if (createdLabel) createdLabelIds.push(createdLabel.id);
    console.log(`   ✅ Song Alpha restored (New ID: ${restoredSongAlpha.id}) with mapped label.`);

    // Verify Song Beta created
    const restoredSongBeta = await songRepository.findByTitle(songBetaTitle);
    if (!restoredSongBeta) throw new Error('Song Beta was not found in DB after restore');
    createdSongIds.push(restoredSongBeta.id);
    console.log(`   ✅ Song Beta restored (New ID: ${restoredSongBeta.id}).`);

    // Verify Setlist Alpha created with songs, mapped IDs, preserved order and offsets
    const restoredSetlistAlpha = await setlistRepository.findByName(setlistAlphaName);
    if (!restoredSetlistAlpha) throw new Error('Setlist Alpha not found in DB after restore');
    createdSetlistIds.push(restoredSetlistAlpha.id);

    const fullSetlistAlpha = await setlistRepository.findById(restoredSetlistAlpha.id);
    if (!fullSetlistAlpha || fullSetlistAlpha.songs.length !== 2) {
      throw new Error(`Setlist Alpha song count mismatch: expected 2, got ${fullSetlistAlpha?.songs.length}`);
    }

    // Verify Track 0: Song Beta (mapped ID), transposeOffset +3
    const track0 = fullSetlistAlpha.songs[0];
    if (track0.song.id !== restoredSongBeta.id || track0.position !== 0 || track0.transposeOffset !== 3) {
      throw new Error(`Setlist Alpha Track 0 mismatch: expected Song Beta (ID: ${restoredSongBeta.id}, pos: 0, offset: 3), got ${JSON.stringify(track0)}`);
    }

    // Verify Track 1: Song Alpha (mapped ID), transposeOffset -2
    const track1 = fullSetlistAlpha.songs[1];
    if (track1.song.id !== restoredSongAlpha.id || track1.position !== 1 || track1.transposeOffset !== -2) {
      throw new Error(`Setlist Alpha Track 1 mismatch: expected Song Alpha (ID: ${restoredSongAlpha.id}, pos: 1, offset: -2), got ${JSON.stringify(track1)}`);
    }
    console.log('   ✅ Setlist Alpha songs verified with mapped new IDs, exact order (0, 1), and transpose offsets (+3, -2).');

    // Verify Empty Setlist created
    const restoredSetlistEmpty = await setlistRepository.findByName(setlistEmptyName);
    if (!restoredSetlistEmpty) throw new Error('Empty Setlist not found in DB after restore');
    createdSetlistIds.push(restoredSetlistEmpty.id);
    const fullEmptySetlist = await setlistRepository.findById(restoredSetlistEmpty.id);
    if (!fullEmptySetlist || fullEmptySetlist.songs.length !== 0) {
      throw new Error(`Empty setlist should have 0 songs, got ${fullEmptySetlist?.songs.length}`);
    }
    console.log('   ✅ Empty setlist verified with 0 songs.');

    // -------------------------------------------------------------------------
    // 4. Missing / Invalid Song Reference Handling in Setlist
    // -------------------------------------------------------------------------
    console.log('\n4. Testing setlist restore with missing/invalid song references...');
    const invalidRefSetName = `InvalidRefService-${testTimestamp}`;
    const invalidRefPayload = {
      format: 'worshipflow-library',
      version: 1,
      songs: [],
      labels: [],
      setlists: [
        {
          name: invalidRefSetName,
          songs: [
            { songId: 999999, position: 0, transposeOffset: 0 }, // Non-existent song ID
            { songId: restoredSongAlpha.id, position: 1, transposeOffset: 1 }, // Valid song ID
          ],
        },
      ],
    };

    const invalidRefRes = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRefPayload),
    });
    const invalidRefJson = (await invalidRefRes.json()) as any;
    if (!invalidRefJson.success) {
      throw new Error(`Invalid ref restore failed: ${JSON.stringify(invalidRefJson)}`);
    }

    const invalidRefList = await setlistRepository.findByName(invalidRefSetName);
    if (!invalidRefList) throw new Error('InvalidRefService not created');
    createdSetlistIds.push(invalidRefList.id);
    const fullInvalidRefList = await setlistRepository.findById(invalidRefList.id);
    if (!fullInvalidRefList || fullInvalidRefList.songs.length !== 1 || fullInvalidRefList.songs[0].song.id !== restoredSongAlpha.id) {
      throw new Error(`InvalidRefService should have skipped 999999 and imported valid song: ${JSON.stringify(fullInvalidRefList)}`);
    }
    console.log('   ✅ Non-existent song ID 999999 was safely ignored while valid song was restored.');

    // -------------------------------------------------------------------------
    // 5. Invalid Payload Rejection (Zero partial records)
    // -------------------------------------------------------------------------
    console.log('\n5. Testing invalid backup format rejection (400 Bad Request)...');
    const badPayloadRes = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: true }),
    });
    if (badPayloadRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request on invalid payload, got ${badPayloadRes.status}`);
    }
    console.log('   ✅ Invalid backup payload correctly rejected with status 400 Bad Request.');

    // -------------------------------------------------------------------------
    // 6. Repeated Restore (Idempotency & Conflict Handling)
    // -------------------------------------------------------------------------
    console.log('\n6. Testing repeated restore (idempotency & conflict handling)...');
    const repeatRes = await fetch(`${baseUrl}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBackupPayload),
    });
    const repeatJson = (await repeatRes.json()) as any;
    if (!repeatJson.success) {
      throw new Error(`Repeated restore failed: ${JSON.stringify(repeatJson)}`);
    }

    // Verify song count did not duplicate
    const verifySongsAlpha = await songRepository.findAll({
      page: 1,
      limit: 100,
      search: songAlphaTitle,
      sort: 'title',
      order: 'ASC',
      labelIds: [],
    });
    if (verifySongsAlpha.length !== 1) {
      throw new Error(`Song was duplicated upon repeated restore! Count: ${verifySongsAlpha.length}`);
    }

    // Verify setlist songs did not duplicate
    const fullRepeatSetlistAlpha = await setlistRepository.findById(restoredSetlistAlpha.id);
    if (!fullRepeatSetlistAlpha || fullRepeatSetlistAlpha.songs.length !== 2) {
      throw new Error(`Setlist songs duplicated upon repeated restore! Count: ${fullRepeatSetlistAlpha?.songs.length}`);
    }
    console.log('   ✅ Repeated restore maintained idempotency: 0 duplicated songs, 0 duplicated setlist items.');

    console.log('\n🎉 ALL FULL-LIBRARY BACKUP & RESTORE TESTS PASSED! 🎉\n');
  } finally {
    // -------------------------------------------------------------------------
    // Clean up all temporary test records
    // -------------------------------------------------------------------------
    console.log('🧹 Cleaning up test fixtures...');
    for (const sid of createdSetlistIds) {
      try {
        await setlistRepository.delete(sid);
      } catch {}
    }
    for (const sid of createdSongIds) {
      try {
        await songRepository.delete(sid);
      } catch {}
    }
    for (const lid of createdLabelIds) {
      try {
        await labelRepository.delete(lid);
      } catch {}
    }
    server.close();
    console.log('   ✅ Cleaned up all temporary test setlists, songs, and labels.');
  }

  process.exit(0);
}

runBackupRestoreTests().catch((err) => {
  console.error('\n❌ Backup & Restore Test Failed:', err);
  process.exit(1);
});
