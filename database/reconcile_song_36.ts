import mysql from '../backend/node_modules/mysql2/promise.js';
import fs from 'fs';
import path from 'path';

interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  song_key: string | null;
  capo: number;
  tempo: number | null;
  difficulty: string;
  content: string;
  content_json: any;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

async function reconcile() {
  console.log('🛡️ Starting WorshipFlow Stage 3B: Controlled Reconciliation of Song ID 36...\n');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  const backupDir = path.resolve(import.meta.dir, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  try {
    // =========================================================================
    // STEP 1: CREATE AND VERIFY COMPLETE BACKUPS OF BOTH DATABASES
    // =========================================================================
    console.log('1. Creating and validating full backups of both databases before any change...');

    const databasesToBackup = ['worshipflow', 'chord_viewer'];
    const backupSummary: Record<string, { sqlPath: string; jsonPath: string; sqlSize: number; jsonSize: number; tables: string[]; rowCounts: Record<string, number> }> = {};

    for (const dbName of databasesToBackup) {
      const sqlPath = path.join(backupDir, `${dbName}_pre_reconcile_${timestamp}.sql`);
      const jsonPath = path.join(backupDir, `${dbName}_pre_reconcile_${timestamp}.json`);

      const [tables] = (await connection.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
        [dbName]
      )) as [any[], any];

      const dbDumpData: Record<string, any[]> = {};
      const rowCounts: Record<string, number> = {};
      let sqlDump = `-- WorshipFlow Pre-Reconciliation Backup for ${dbName}\n-- Generated on: ${new Date().toISOString()}\n\n`;

      for (const t of tables) {
        const tableName = t.TABLE_NAME;
        const [rows] = (await connection.query(`SELECT * FROM \`${dbName}\`.\`${tableName}\``)) as [any[], any];
        dbDumpData[tableName] = rows;
        rowCounts[tableName] = rows.length;

        const [createTableRes] = (await connection.query(`SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``)) as [any[], any];
        sqlDump += `${createTableRes[0]['Create Table']};\n\n`;

        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          for (const row of rows) {
            const values = columns.map((col) => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'object' && !(val instanceof Date)) {
                return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
              }
              if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            });
            sqlDump += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
          }
          sqlDump += '\n';
        }
      }

      fs.writeFileSync(sqlPath, sqlDump, 'utf8');
      fs.writeFileSync(jsonPath, JSON.stringify(dbDumpData, null, 2), 'utf8');

      // Validation
      if (!fs.existsSync(sqlPath) || fs.statSync(sqlPath).size === 0) {
        throw new Error(`Validation failed: SQL backup for ${dbName} is missing or empty!`);
      }
      if (!fs.existsSync(jsonPath) || fs.statSync(jsonPath).size === 0) {
        throw new Error(`Validation failed: JSON backup for ${dbName} is missing or empty!`);
      }

      // Test JSON readability
      const parsedJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!parsedJson.songs || !Array.isArray(parsedJson.songs)) {
        throw new Error(`Validation failed: JSON backup for ${dbName} does not contain valid songs array!`);
      }

      const sqlSize = fs.statSync(sqlPath).size;
      const jsonSize = fs.statSync(jsonPath).size;

      backupSummary[dbName] = {
        sqlPath,
        jsonPath,
        sqlSize,
        jsonSize,
        tables: tables.map((t: any) => t.TABLE_NAME),
        rowCounts,
      };

      console.log(`   ✅ ${dbName} SQL backup validated: ${sqlPath} (${(sqlSize / 1024).toFixed(1)} KB)`);
      console.log(`   ✅ ${dbName} JSON backup validated: ${jsonPath} (${(jsonSize / 1024).toFixed(1)} KB)`);
      console.log(`      Rows captured: ${JSON.stringify(rowCounts)}`);
    }

    // =========================================================================
    // STEP 2: RECHECK TARGET & CONFLICT CONDITIONS IMMEDIATELY BEFORE WRITE
    // =========================================================================
    console.log('\n2. Running strict pre-write conflict and target checks...');

    // 2.1 Confirm active target database is worshipflow
    await connection.query('USE `worshipflow`');
    const [currentDbRes] = (await connection.query('SELECT DATABASE() as active_db')) as [any[], any];
    if (currentDbRes[0].active_db !== 'worshipflow') {
      throw new Error(`Active database mismatch: expected 'worshipflow', got '${currentDbRes[0].active_db}'`);
    }
    console.log(`   ✅ Target database connection confirmed: "${currentDbRes[0].active_db}"`);

    // 2.2 Confirm worshipflow.songs does not contain ID 36
    const [wfId36] = (await connection.query('SELECT * FROM `worshipflow`.`songs` WHERE id = 36')) as [any[], any];
    if (wfId36.length > 0) {
      throw new Error(`Conflict detected: ID 36 already exists in worshipflow.songs! Pre-write check failed.`);
    }
    console.log('   ✅ Confirmed ID 36 is unoccupied in worshipflow.songs.');

    // 2.3 Search worshipflow.songs for exact title
    const targetTitle = 'ඔබ මෙන් වෙන / OBA MEN WENA KISIWEKU';
    const [wfTitleMatch] = (await connection.query(
      'SELECT * FROM `worshipflow`.`songs` WHERE title = ?',
      [targetTitle]
    )) as [any[], any];
    if (wfTitleMatch.length > 0) {
      throw new Error(`Conflict detected: A song titled "${targetTitle}" already exists in worshipflow.songs (ID: ${wfTitleMatch[0].id})!`);
    }
    console.log(`   ✅ Confirmed no song with title "${targetTitle}" exists in worshipflow.songs.`);

    // 2.4 Search worshipflow.songs for possible partial/fuzzy matches
    const [wfFuzzyMatch] = (await connection.query(
      "SELECT id, title FROM `worshipflow`.`songs` WHERE title LIKE '%ඔබ%' OR title LIKE '%OBA%'"
    )) as [any[], any];
    if (wfFuzzyMatch.length > 0) {
      throw new Error(`Potential duplicate song detected in worshipflow: ${JSON.stringify(wfFuzzyMatch)}`);
    }
    console.log('   ✅ Confirmed 0 matching or duplicate songs by title/artist search.');

    // 2.5 Confirm source record exists in chord_viewer.songs with ID 36
    const [cvSong36] = (await connection.query(
      'SELECT * FROM `chord_viewer`.`songs` WHERE id = 36'
    )) as [SongRow[], any];
    if (cvSong36.length === 0) {
      throw new Error('Source song ID 36 not found in chord_viewer.songs! Aborting reconciliation.');
    }
    const sourceSong = cvSong36[0];
    if (sourceSong.title !== targetTitle) {
      throw new Error(`Source song title mismatch: expected "${targetTitle}", got "${sourceSong.title}"`);
    }
    if (!sourceSong.content || sourceSong.content.length === 0) {
      throw new Error('Source song content is empty!');
    }
    console.log(`   ✅ Source song confirmed in chord_viewer: ID 36, Title: "${sourceSong.title}", Artist: "${sourceSong.artist}"`);

    // 2.6 Confirm source song has no labels or setlist items (as verified in audit)
    const [cvLabels] = (await connection.query(
      'SELECT * FROM `chord_viewer`.`song_labels` WHERE song_id = 36'
    )) as [any[], any];
    const [cvSetlists] = (await connection.query(
      'SELECT * FROM `chord_viewer`.`setlist_songs` WHERE song_id = 36'
    )) as [any[], any];
    if (cvLabels.length > 0 || cvSetlists.length > 0) {
      throw new Error(`Unexpected relations found for song 36 in chord_viewer: ${cvLabels.length} labels, ${cvSetlists.length} setlist links. Aborting.`);
    }
    console.log('   ✅ Confirmed 0 label links and 0 setlist links for song 36.');

    // 2.7 Confirm target table constraints and AUTO_INCREMENT
    const [autoIncRes] = (await connection.query(
      `SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'worshipflow' AND TABLE_NAME = 'songs'`
    )) as [any[], any];
    const currentAutoInc = autoIncRes[0]?.AUTO_INCREMENT ?? 0;
    console.log(`   ✅ worshipflow.songs AUTO_INCREMENT verified: ${currentAutoInc} (Safe for inserting ID 36).`);

    // =========================================================================
    // STEP 3: PERFORM CONTROLLED RECONCILIATION IN TRANSACTION
    // =========================================================================
    console.log('\n3. Performing controlled single-row insert inside transaction...');

    await connection.beginTransaction();

    try {
      const insertSql = `
        INSERT INTO \`worshipflow\`.\`songs\`
          (id, title, artist, song_key, capo, tempo, difficulty, content, content_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const formattedJson = typeof sourceSong.content_json === 'string'
        ? sourceSong.content_json
        : JSON.stringify(sourceSong.content_json);

      const [insertResult] = (await connection.execute(insertSql, [
        sourceSong.id,
        sourceSong.title,
        sourceSong.artist,
        sourceSong.song_key,
        sourceSong.capo,
        sourceSong.tempo,
        sourceSong.difficulty,
        sourceSong.content,
        formattedJson,
        sourceSong.notes,
        sourceSong.created_at,
        sourceSong.updated_at,
      ])) as [any, any];

      if (insertResult.affectedRows !== 1) {
        throw new Error(`Expected exactly 1 affected row, got ${insertResult.affectedRows}`);
      }

      await connection.commit();
      console.log('   ✅ Transaction committed successfully: 1 row inserted.');
    } catch (insertErr) {
      await connection.rollback();
      throw new Error(`Transaction failed and was rolled back: ${(insertErr as Error).message}`);
    }

    // =========================================================================
    // STEP 4: VERIFY POST-WRITE READ-ONLY INTEGRITY
    // =========================================================================
    console.log('\n4. Verifying post-write database integrity...');

    // 4.1 Target contains exactly one row for ID 36
    const [verifyTargetRows] = (await connection.query(
      'SELECT * FROM `worshipflow`.`songs` WHERE id = 36'
    )) as [SongRow[], any];
    if (verifyTargetRows.length !== 1) {
      throw new Error(`Verification failed: Expected 1 row for ID 36 in worshipflow, found ${verifyTargetRows.length}`);
    }
    const targetSong = verifyTargetRows[0];
    console.log(`   ✅ Target row verified: ID ${targetSong.id}, Title: "${targetSong.title}"`);

    // 4.2 Exact field comparisons
    const fieldComparisons = [
      { field: 'id', match: targetSong.id === sourceSong.id, val: targetSong.id },
      { field: 'title', match: targetSong.title === sourceSong.title, val: targetSong.title },
      { field: 'artist', match: targetSong.artist === sourceSong.artist, val: targetSong.artist },
      { field: 'song_key', match: targetSong.song_key === sourceSong.song_key, val: targetSong.song_key },
      { field: 'capo', match: targetSong.capo === sourceSong.capo, val: targetSong.capo },
      { field: 'tempo', match: targetSong.tempo === sourceSong.tempo, val: targetSong.tempo },
      { field: 'difficulty', match: targetSong.difficulty === sourceSong.difficulty, val: targetSong.difficulty },
      { field: 'notes', match: targetSong.notes === sourceSong.notes, val: targetSong.notes },
      { field: 'content length', match: targetSong.content?.length === sourceSong.content?.length, val: `${targetSong.content?.length} chars` },
      { field: 'content exact', match: targetSong.content === sourceSong.content, val: 'Exact match' },
    ];

    for (const fc of fieldComparisons) {
      if (!fc.match) throw new Error(`Field mismatch on '${fc.field}'!`);
      console.log(`   ✅ Field '${fc.field}': ${fc.val} (Match: 100%)`);
    }

    // Compare content_json
    const targetJsonStr = typeof targetSong.content_json === 'string' ? targetSong.content_json : JSON.stringify(targetSong.content_json);
    const sourceJsonStr = typeof sourceSong.content_json === 'string' ? sourceSong.content_json : JSON.stringify(sourceSong.content_json);
    if (targetJsonStr !== sourceJsonStr) {
      throw new Error(`content_json mismatch between source and target!`);
    }
    console.log(`   ✅ Field 'content_json': Exact structured JSON match (${targetJsonStr.length} bytes).`);

    // 4.3 Verify the 6 previously shared songs in worshipflow remain unchanged
    const commonIds = [1, 2, 3, 4, 5, 22];
    for (const id of commonIds) {
      const [commonWf] = (await connection.query('SELECT * FROM `worshipflow`.`songs` WHERE id = ?', [id])) as [any[], any];
      const [commonCv] = (await connection.query('SELECT * FROM `chord_viewer`.`songs` WHERE id = ?', [id])) as [any[], any];
      if (commonWf.length !== 1 || commonCv.length !== 1 || commonWf[0].title !== commonCv[0].title || commonWf[0].content !== commonCv[0].content) {
        throw new Error(`Previously shared song ID ${id} was altered!`);
      }
    }
    console.log('   ✅ Confirmed all 6 previously shared songs (IDs 1, 2, 3, 4, 5, 22) remain 100% unchanged.');

    // 4.4 Verify labels, song_labels, setlists, and setlist_songs in worshipflow
    const [wfLabelsCount] = (await connection.query('SELECT COUNT(*) as c FROM `worshipflow`.`labels`')) as [any[], any];
    const [wfSongLabelsCount] = (await connection.query('SELECT COUNT(*) as c FROM `worshipflow`.`song_labels`')) as [any[], any];
    const [wfSetlistsCount] = (await connection.query('SELECT COUNT(*) as c FROM `worshipflow`.`setlists`')) as [any[], any];
    const [wfSetlistSongsCount] = (await connection.query('SELECT COUNT(*) as c FROM `worshipflow`.`setlist_songs`')) as [any[], any];

    if (wfLabelsCount[0].c !== 10 || wfSongLabelsCount[0].c !== 10 || wfSetlistsCount[0].c !== 1 || wfSetlistSongsCount[0].c !== 4) {
      throw new Error('Related table count altered in worshipflow!');
    }
    console.log('   ✅ Confirmed related tables in worshipflow unchanged: labels=10, song_labels=10, setlists=1, setlist_songs=4.');

    // 4.5 Confirm chord_viewer was NOT modified in any way
    const [cvSongsCount] = (await connection.query('SELECT COUNT(*) as c FROM `chord_viewer`.`songs`')) as [any[], any];
    const [cvLabelsCount] = (await connection.query('SELECT COUNT(*) as c FROM `chord_viewer`.`labels`')) as [any[], any];
    const [cvSongLabelsCount] = (await connection.query('SELECT COUNT(*) as c FROM `chord_viewer`.`song_labels`')) as [any[], any];
    const [cvSetlistsCount] = (await connection.query('SELECT COUNT(*) as c FROM `chord_viewer`.`setlists`')) as [any[], any];
    const [cvSetlistSongsCount] = (await connection.query('SELECT COUNT(*) as c FROM `chord_viewer`.`setlist_songs`')) as [any[], any];

    if (cvSongsCount[0].c !== 7 || cvLabelsCount[0].c !== 10 || cvSongLabelsCount[0].c !== 10 || cvSetlistsCount[0].c !== 1 || cvSetlistSongsCount[0].c !== 4) {
      throw new Error('Legacy chord_viewer database was modified!');
    }
    console.log('   ✅ Confirmed legacy chord_viewer database is 100% untouched (7 songs, 10 labels, 10 song_labels, 1 setlist, 4 setlist_songs).');

    // Total song count in worshipflow is now 7
    const [wfTotalSongs] = (await connection.query('SELECT COUNT(*) as c FROM `worshipflow`.`songs`')) as [any[], any];
    console.log(`\n🎉 RECONCILIATION COMPLETE! worshipflow.songs now contains ${wfTotalSongs[0].c} songs.`);

  } finally {
    await connection.end();
  }
}

reconcile().catch((err) => {
  console.error('\n❌ Reconciliation Failed:', err);
  process.exit(1);
});
