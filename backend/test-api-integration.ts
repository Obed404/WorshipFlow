import { app } from './src/index.js';
import http from 'http';

async function runTests() {
  console.log('🚀 Starting Backend Integration Tests...\n');

  // Start server on a test port
  const server = http.createServer(app.getApp());
  await new Promise<void>((resolve) => server.listen(3008, resolve));
  const baseUrl = 'http://localhost:3008/api';

  try {
    // 1. Health check
    console.log('1. Testing /health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json() as any;
    if (!healthData.success || healthData.data.services.database !== 'healthy') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log('   ✅ Health check passed. Database status: healthy');

    // 2. GET /labels
    console.log('2. Testing GET /labels...');
    const labelsRes = await fetch(`${baseUrl}/labels`);
    const labelsData = await labelsRes.json() as any;
    if (!labelsData.success || !Array.isArray(labelsData.data)) {
      throw new Error(`GET /labels failed: ${JSON.stringify(labelsData)}`);
    }
    console.log(`   ✅ GET /labels passed. Found ${labelsData.data.length} labels.`);

    // 3. POST /labels
    console.log('3. Testing POST /labels...');
    const newLabelName = `TestLabel-${Date.now()}`;
    const createLabelRes = await fetch(`${baseUrl}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLabelName,
        color: '#10b981',
        instrument: 'GUITAR',
      }),
    });
    const createLabelData = await createLabelRes.json() as any;
    if (!createLabelData.success || !createLabelData.data.id) {
      throw new Error(`POST /labels failed: ${JSON.stringify(createLabelData)}`);
    }
    const createdLabelId = createLabelData.data.id;
    console.log(`   ✅ POST /labels passed. Created label ID: ${createdLabelId}`);

    // 4. GET /songs
    console.log('4. Testing GET /songs...');
    const songsRes = await fetch(`${baseUrl}/songs`);
    const songsData = await songsRes.json() as any;
    if (!songsData.success || !Array.isArray(songsData.data)) {
      throw new Error(`GET /songs failed: ${JSON.stringify(songsData)}`);
    }
    console.log(`   ✅ GET /songs passed. Found ${songsData.data.length} songs.`);

    // 5. POST /songs (with transaction and labels)
    console.log('5. Testing POST /songs with transaction and labels...');
    const createSongRes = await fetch(`${baseUrl}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integration Test Song',
        artist: 'Test Artist',
        songKey: 'G',
        capo: 2,
        tempo: 120,
        content: '[G]Test lyrics [C]with inline [D]chords',
        notes: 'Test notes',
        labelIds: [createdLabelId],
      }),
    });
    const createSongData = await createSongRes.json() as any;
    if (!createSongData.success || !createSongData.data.id || createSongData.data.labels.length === 0) {
      throw new Error(`POST /songs failed: ${JSON.stringify(createSongData)}`);
    }
    const createdSongId = createSongData.data.id;
    console.log(`   ✅ POST /songs passed. Created song ID: ${createdSongId} with ${createSongData.data.labels.length} label(s)`);

    // 6. GET /songs/:id
    console.log(`6. Testing GET /songs/${createdSongId}...`);
    const getSongRes = await fetch(`${baseUrl}/songs/${createdSongId}`);
    const getSongData = await getSongRes.json() as any;
    if (!getSongData.success || getSongData.data.title !== 'Integration Test Song') {
      throw new Error(`GET /songs/:id failed: ${JSON.stringify(getSongData)}`);
    }
    console.log('   ✅ GET /songs/:id passed.');

    // 7. Search & Filter /songs
    console.log('7. Testing filtering /songs?search=Integration...');
    const filterRes = await fetch(`${baseUrl}/songs?search=Integration&labelIds=${createdLabelId}`);
    const filterData = await filterRes.json() as any;
    if (!filterData.success || filterData.data.length === 0) {
      throw new Error(`Filter songs failed: ${JSON.stringify(filterData)}`);
    }
    console.log(`   ✅ Filtering passed. Filtered count: ${filterData.data.length}`);

    // 8. PUT /songs/:id (updating song and labels in transaction)
    console.log(`8. Testing PUT /songs/${createdSongId}...`);
    const updateSongRes = await fetch(`${baseUrl}/songs/${createdSongId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Integration Test Song',
        capo: 3,
      }),
    });
    const updateSongData = await updateSongRes.json() as any;
    if (!updateSongData.success || updateSongData.data.title !== 'Updated Integration Test Song' || updateSongData.data.capo !== 3) {
      throw new Error(`PUT /songs/:id failed: ${JSON.stringify(updateSongData)}`);
    }
    console.log('   ✅ PUT /songs/:id passed.');

    // 9. DELETE /songs/:id
    console.log(`9. Testing DELETE /songs/${createdSongId}...`);
    const deleteSongRes = await fetch(`${baseUrl}/songs/${createdSongId}`, { method: 'DELETE' });
    const deleteSongData = await deleteSongRes.json() as any;
    if (!deleteSongData.success) {
      throw new Error(`DELETE /songs/:id failed: ${JSON.stringify(deleteSongData)}`);
    }
    console.log('   ✅ DELETE /songs/:id passed.');

    // 10. DELETE /labels/:id
    console.log(`10. Testing DELETE /labels/${createdLabelId}...`);
    const deleteLabelRes = await fetch(`${baseUrl}/labels/${createdLabelId}`, { method: 'DELETE' });
    if (deleteLabelRes.status !== 200 && deleteLabelRes.status !== 204) {
      throw new Error(`DELETE /labels/:id failed with status ${deleteLabelRes.status}`);
    }
    console.log('   ✅ DELETE /labels/:id passed.');

    // 11. Validation error testing (400 Bad Request)
    console.log('11. Testing 400 Bad Request on invalid song input...');
    const invalidRes = await fetch(`${baseUrl}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }), // Invalid: empty title & missing content
    });
    if (invalidRes.status !== 400) {
      throw new Error(`Expected error status 400, got ${invalidRes.status}`);
    }
    const invalidData = await invalidRes.json() as any;
    console.log(`   ✅ Validation error correctly returned status 400: ${invalidData.message}`);

    console.log('\n🎉 ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
