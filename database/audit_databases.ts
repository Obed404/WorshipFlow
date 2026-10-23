import mysql from 'mysql2/promise';

async function auditDetails() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('====================================================');
  console.log('1. INSPECTING SONG ID 36 IN chord_viewer');
  console.log('====================================================');
  const [song36Rows] = (await conn.query(
    'SELECT * FROM `chord_viewer`.`songs` WHERE id = 36'
  )) as [any[], any];
  
  if (song36Rows.length > 0) {
    const s = song36Rows[0];
    console.log('Song 36 Fields:');
    console.log('  id:', s.id);
    console.log('  title:', s.title);
    console.log('  artist:', s.artist);
    console.log('  song_key:', s.song_key);
    console.log('  capo:', s.capo);
    console.log('  tempo:', s.tempo);
    console.log('  difficulty:', s.difficulty);
    console.log('  notes:', s.notes);
    console.log('  created_at:', s.created_at);
    console.log('  updated_at:', s.updated_at);
    console.log('  content:\n', s.content);
    console.log('  content_json:\n', JSON.stringify(s.content_json, null, 2));
  } else {
    console.log('Song 36 not found in chord_viewer');
  }

  // Check if Song 36 has any labels in chord_viewer
  const [song36Labels] = (await conn.query(
    'SELECT * FROM `chord_viewer`.`song_labels` WHERE song_id = 36'
  )) as [any[], any];
  console.log('Song 36 labels in chord_viewer:', song36Labels);

  // Check if Song 36 is in any setlist in chord_viewer
  const [song36Setlists] = (await conn.query(
    'SELECT * FROM `chord_viewer`.`setlist_songs` WHERE song_id = 36'
  )) as [any[], any];
  console.log('Song 36 setlists in chord_viewer:', song36Setlists);

  // Check if any song with title 'ඔබ මෙන් වෙන' or 'OBA MEN WENA' exists in worshipflow
  const [wfMatchingSongs] = (await conn.query(
    "SELECT * FROM `worshipflow`.`songs` WHERE title LIKE '%ඔබ%' OR title LIKE '%OBA%'"
  )) as [any[], any];
  console.log('\nMatching songs in worshipflow by title search:', wfMatchingSongs.map((s: any) => ({ id: s.id, title: s.title })));

  console.log('\n====================================================');
  console.log('2. COMPARING CONTENT OF 6 COMMON SONGS');
  console.log('====================================================');
  const commonIds = [1, 2, 3, 4, 5, 22];
  for (const id of commonIds) {
    const [wfSong] = (await conn.query('SELECT * FROM `worshipflow`.`songs` WHERE id = ?', [id])) as [any[], any];
    const [cvSong] = (await conn.query('SELECT * FROM `chord_viewer`.`songs` WHERE id = ?', [id])) as [any[], any];

    const s1 = wfSong[0];
    const s2 = cvSong[0];

    const diffs: string[] = [];
    if (s1.title !== s2.title) diffs.push(`title: '${s1.title}' vs '${s2.title}'`);
    if (s1.artist !== s2.artist) diffs.push(`artist: '${s1.artist}' vs '${s2.artist}'`);
    if (s1.song_key !== s2.song_key) diffs.push(`song_key: '${s1.song_key}' vs '${s2.song_key}'`);
    if (s1.capo !== s2.capo) diffs.push(`capo: ${s1.capo} vs ${s2.capo}`);
    if (s1.tempo !== s2.tempo) diffs.push(`tempo: ${s1.tempo} vs ${s2.tempo}`);
    if (s1.difficulty !== s2.difficulty) diffs.push(`difficulty: ${s1.difficulty} vs ${s2.difficulty}`);
    if (s1.content !== s2.content) diffs.push(`content: diff length ${s1.content?.length} vs ${s2.content?.length}`);
    if (s1.notes !== s2.notes) diffs.push(`notes: '${s1.notes}' vs '${s2.notes}'`);

    const json1 = typeof s1.content_json === 'string' ? s1.content_json : JSON.stringify(s1.content_json);
    const json2 = typeof s2.content_json === 'string' ? s2.content_json : JSON.stringify(s2.content_json);
    if (json1 !== json2) {
      diffs.push(`content_json diff: length ${json1?.length} vs ${json2?.length}`);
    }

    if (diffs.length === 0) {
      console.log(`Song [${id}] "${s1.title}": IDENTICAL in both databases`);
    } else {
      console.log(`Song [${id}] "${s1.title}": DIFFERENCES FOUND ->`, diffs.join(', '));
    }
  }

  console.log('\n====================================================');
  console.log('3. COMPARING SCHEMAS ACROSS ALL TABLES');
  console.log('====================================================');
  const tables = ['labels', 'songs', 'song_labels', 'setlists', 'setlist_songs'];

  for (const t of tables) {
    const [wfCols] = (await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'worshipflow' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [t])) as [any[], any];

    const [cvCols] = (await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'chord_viewer' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [t])) as [any[], any];

    const wfMap = new Map(wfCols.map((c: any) => [c.COLUMN_NAME, c]));
    const cvMap = new Map(cvCols.map((c: any) => [c.COLUMN_NAME, c]));

    const allColNames = Array.from(new Set([...wfMap.keys(), ...cvMap.keys()]));
    const colDiffs: string[] = [];

    for (const col of allColNames) {
      const c1 = wfMap.get(col);
      const c2 = cvMap.get(col);

      if (!c1) {
        colDiffs.push(`Column '${col}' missing in worshipflow`);
      } else if (!c2) {
        colDiffs.push(`Column '${col}' missing in chord_viewer`);
      } else {
        if (c1.COLUMN_TYPE !== c2.COLUMN_TYPE) colDiffs.push(`'${col}' type: ${c1.COLUMN_TYPE} vs ${c2.COLUMN_TYPE}`);
        if (c1.IS_NULLABLE !== c2.IS_NULLABLE) colDiffs.push(`'${col}' nullable: ${c1.IS_NULLABLE} vs ${c2.IS_NULLABLE}`);
        if (c1.COLUMN_KEY !== c2.COLUMN_KEY) colDiffs.push(`'${col}' key: ${c1.COLUMN_KEY} vs ${c2.COLUMN_KEY}`);
      }
    }

    if (colDiffs.length === 0) {
      console.log(`Table '${t}': Column schema matches 100% (${wfCols.length} columns)`);
    } else {
      console.log(`Table '${t}': SCHEMA DIFFERENCES ->`, colDiffs.join('; '));
    }
  }

  // Check Foreign Keys
  console.log('\nForeign Keys:');
  const [wfFks] = (await conn.query(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'worshipflow' AND REFERENCED_TABLE_NAME IS NOT NULL
  `)) as [any[], any];
  console.log('worshipflow FKs:', wfFks);

  const [cvFks] = (await conn.query(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'chord_viewer' AND REFERENCED_TABLE_NAME IS NOT NULL
  `)) as [any[], any];
  console.log('chord_viewer FKs:', cvFks);

  // Check Auto Increment
  const [autoInc] = (await conn.query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, AUTO_INCREMENT
    FROM information_schema.TABLES
    WHERE TABLE_NAME = 'songs' AND TABLE_SCHEMA IN ('worshipflow', 'chord_viewer')
  `)) as [any[], any];
  console.log('\nSongs AUTO_INCREMENT values:', autoInc);

  await conn.end();
}

auditDetails().catch(err => {
  console.error(err);
  process.exit(1);
});
