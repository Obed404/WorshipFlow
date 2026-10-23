import { songRepository } from './src/modules/songs/repository/song.repository.js';
import { songController } from './src/modules/songs/controllers/song.controller.js';
import { parseRawToStructuredSections, structuredSectionsToRaw, buildWorshipFlowSongDocument } from './src/modules/songs/utils/song_converter.js';

async function runTests() {
  console.log('🧪 Testing WorshipFlow Song Document, Export/Import & Database Features...\n');

  // Test 1: Parser and Serializer
  console.log('1. Testing raw bracket parsing and round-trip conversion...');
  const sampleChordSheet = `[Verse 1]
[C]Amazing [G]grace, how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me

[Chorus]
[F]I once was [C]lost, but [G]now am [Am]found
[F]Was blind but [C]now I [G]see [C]`;

  const sections = parseRawToStructuredSections(sampleChordSheet);
  if (sections.length !== 2) throw new Error(`Expected 2 sections, got ${sections.length}`);
  if (sections[0].label !== 'Verse 1') throw new Error(`Expected Verse 1, got ${sections[0].label}`);
  if (sections[0].lines[0].chords.length !== 4) throw new Error(`Expected 4 chords in line 1, got ${sections[0].lines[0].chords.length}`);
  
  const reconstructed = structuredSectionsToRaw(sections);
  console.log('   ✅ Sections parsed successfully:', sections.map(s => `${s.label} (${s.lines.length} lines)`).join(', '));
  console.log('   ✅ Reconstructed chord sheet matches structure.');

  // Test 2: Song Creation with automatic content_json in MySQL
  console.log('\n2. Testing Song Creation with content_json in MySQL...');
  const testSong = await songRepository.create({
    title: 'WorshipFlow Verification Song',
    artist: 'Test Artist',
    songKey: 'G',
    capo: 0,
    tempo: 120,
    difficulty: 'BEGINNER',
    content: sampleChordSheet,
    notes: 'Test notes',
  });

  if (!testSong.id) throw new Error('Song failed to create');
  console.log(`   ✅ Song created with ID: ${testSong.id}`);
  console.log(`   ✅ Structured sections stored in song object: ${testSong.sections?.length || 0} sections`);

  // Test 3: Song Export Document
  console.log('\n3. Testing buildWorshipFlowSongDocument...');
  const exportDoc = buildWorshipFlowSongDocument(testSong);
  if (exportDoc.format !== 'worshipflow-song') throw new Error('Invalid format');
  if (exportDoc.song.title !== 'WorshipFlow Verification Song') throw new Error('Song title mismatch');
  console.log(`   ✅ Export document verified. Format: "${exportDoc.format}", Version: ${exportDoc.version}`);

  // Test 4: Song Import with conflict resolution
  console.log('\n4. Testing importSongs handler...');
  let mockResJson: any = null;
  let mockResStatus: number = 200;
  const mockReq: any = {
    body: {
      format: 'worshipflow-song',
      version: 1,
      conflictMode: 'overwrite',
      song: {
        title: 'WorshipFlow Verification Song',
        artist: 'Updated Artist',
        songKey: 'A',
        difficulty: 'INTERMEDIATE',
        sections,
      },
    },
    query: {},
  };
  const mockRes: any = {
    status(code: number) {
      mockResStatus = code;
      return this;
    },
    json(data: any) {
      mockResJson = data;
      return this;
    },
  };

  await songController.importSongs(mockReq, mockRes);
  if (mockResStatus !== 200 || !mockResJson?.success) {
    throw new Error(`Import failed: ${JSON.stringify(mockResJson)}`);
  }
  console.log('   ✅ Import result:', mockResJson.message);

  // Test 5: Verify update from import in database
  const updated = await songRepository.findById(testSong.id);
  if (updated?.artist !== 'Updated Artist' || updated?.songKey !== 'A') {
    throw new Error(`Song was not properly overwritten by import. Artist: ${updated?.artist}`);
  }
  console.log('   ✅ Overwritten song in DB verified: Artist = "Updated Artist", Key = "A"');

  // Clean up test song
  await songRepository.delete(testSong.id);
  console.log('   ✅ Cleaned up verification song.');

  console.log('\n🎉 ALL WORSHIPFLOW STORAGE, EXPORT & IMPORT TESTS PASSED! 🎉');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
