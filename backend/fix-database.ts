import mysql from 'mysql2/promise';
import { parseRawToStructuredSections } from './src/modules/songs/utils/song_converter.js';

async function fixDatabaseSide() {
  console.log('🔧 Fixing Database Side for both worshipflow and chord_viewer...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const databases = ['worshipflow', 'chord_viewer'];

    for (const dbName of databases) {
      console.log(`📂 Checking database: ${dbName}`);

      // 1. Check if content_json column exists
      const [cols] = await connection.query(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'songs' AND COLUMN_NAME = 'content_json'
      `, [dbName]) as [any[], any];

      if (cols.length === 0) {
        console.log(`   ➕ Adding missing 'content_json' column to ${dbName}.songs...`);
        await connection.query(`
          ALTER TABLE \`${dbName}\`.\`songs\`
          ADD COLUMN \`content_json\` JSON DEFAULT NULL AFTER \`content\`
        `);
        console.log(`   ✅ 'content_json' column added successfully.`);
      } else {
        console.log(`   ✅ 'content_json' column already exists in ${dbName}.songs.`);
      }

      // 2. Check if difficulty column exists
      const [diffCols] = await connection.query(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'songs' AND COLUMN_NAME = 'difficulty'
      `, [dbName]) as [any[], any];

      if (diffCols.length === 0) {
        console.log(`   ➕ Adding missing 'difficulty' column to ${dbName}.songs...`);
        await connection.query(`
          ALTER TABLE \`${dbName}\`.\`songs\`
          ADD COLUMN \`difficulty\` ENUM('BEGINNER','INTERMEDIATE','ADVANCED') DEFAULT 'BEGINNER' AFTER \`tempo\`
        `);
        console.log(`   ✅ 'difficulty' column added.`);
      } else {
        console.log(`   ✅ 'difficulty' column exists in ${dbName}.songs.`);
      }

      // 3. Populate content_json for any songs that have NULL content_json
      const [songs] = await connection.query(`
        SELECT id, content FROM \`${dbName}\`.\`songs\` WHERE content_json IS NULL
      `) as [any[], any];

      if (songs.length > 0) {
        console.log(`   🔄 Populating content_json for ${songs.length} songs in ${dbName}...`);
        for (const s of songs) {
          const sections = parseRawToStructuredSections(s.content);
          const contentJson = JSON.stringify({
            format: 'worshipflow-song',
            version: 1,
            sections,
          });
          await connection.query(`
            UPDATE \`${dbName}\`.\`songs\` SET content_json = ? WHERE id = ?
          `, [contentJson, s.id]);
        }
        console.log(`   ✅ Populated content_json for ${songs.length} songs.`);
      } else {
        console.log(`   ✅ All songs in ${dbName} already have structured content_json.`);
      }

      // 4. Refresh views (songs_with_labels) so that SELECT * picks up the new columns
      try {
        await connection.query(`
          CREATE OR REPLACE VIEW \`${dbName}\`.\`songs_with_labels\` AS
          SELECT s.*,
            GROUP_CONCAT(l.name ORDER BY l.name SEPARATOR ', ') as label_names,
            GROUP_CONCAT(l.id ORDER BY l.name SEPARATOR ',') as label_ids
          FROM \`${dbName}\`.\`songs\` s
          LEFT JOIN \`${dbName}\`.\`song_labels\` sl ON s.id = sl.song_id
          LEFT JOIN \`${dbName}\`.\`labels\` l ON sl.label_id = l.id
          GROUP BY s.id;
        `);
        console.log(`   ✅ Refreshed view ${dbName}.songs_with_labels.`);
      } catch (err: any) {
        console.warn(`   ⚠️ Warning updating view in ${dbName}:`, err.message);
      }
    }

    console.log('\n🎉 BOTH DATABASES (worshipflow and chord_viewer) ARE NOW FULLY COMPATIBLE WITH content_json!');
  } finally {
    await connection.end();
  }
}

fixDatabaseSide().catch(err => {
  console.error('❌ Error fixing database side:', err);
  process.exit(1);
});
