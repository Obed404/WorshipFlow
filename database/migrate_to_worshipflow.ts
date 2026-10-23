import mysql from '../backend/node_modules/mysql2/promise.js';
import fs from 'fs';
import path from 'path';
import { parseRawToStructuredSections } from '../backend/src/modules/songs/utils/song_converter.js';

interface MigrationConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  sourceDb: string;
  targetDb: string;
}

const config: MigrationConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  sourceDb: 'chord_viewer',
  targetDb: 'worshipflow',
};

async function runMigration() {
  console.log('🚀 Starting Safe MySQL Database Migration to WorshipFlow...');
  console.log(`📡 Connecting to MySQL on ${config.host}:${config.port} as ${config.user}`);
  console.log(`📦 Source Database: ${config.sourceDb}`);
  console.log(`🎯 Target Database: ${config.targetDb}\n`);

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Verify Source Database Exists
    // -------------------------------------------------------------
    const [dbs] = (await connection.query('SHOW DATABASES')) as [any[], any];
    const dbNames = dbs.map((d: any) => d.Database);
    if (!dbNames.includes(config.sourceDb)) {
      throw new Error(`Source database "${config.sourceDb}" does not exist! Migration aborted.`);
    }

    console.log(`✅ Step 1: Source database "${config.sourceDb}" confirmed.`);

    // -------------------------------------------------------------
    // Step 2: Export Full Backup of Source Database
    // -------------------------------------------------------------
    console.log('💾 Step 2: Exporting backup of source database...');
    const backupDir = path.resolve(import.meta.dir, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupJsonPath = path.join(backupDir, `chord_viewer_backup_${timestamp}.json`);
    const backupSqlPath = path.join(backupDir, `chord_viewer_backup_${timestamp}.sql`);

    const [sourceTables] = (await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${config.sourceDb}' AND table_type = 'BASE TABLE'`
    )) as [any[], any];

    const backupData: Record<string, any[]> = {};
    let sqlDump = `-- Backup of ${config.sourceDb} generated on ${new Date().toISOString()}\n\n`;

    for (const t of sourceTables) {
      const tableName = t.TABLE_NAME || t.table_name;
      const [rows] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`${tableName}\``)) as [any[], any];
      backupData[tableName] = rows;

      const [createRes] = (await connection.query(`SHOW CREATE TABLE \`${config.sourceDb}\`.\`${tableName}\``)) as [any[], any];
      sqlDump += `${createRes[0]['Create Table']};\n\n`;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        for (const row of rows) {
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
          });
          sqlDump += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += '\n';
      }
    }

    fs.writeFileSync(backupJsonPath, JSON.stringify(backupData, null, 2), 'utf8');
    fs.writeFileSync(backupSqlPath, sqlDump, 'utf8');
    console.log(`   ✅ Backup saved to: ${backupSqlPath}`);
    console.log(`   ✅ Structured JSON backup saved to: ${backupJsonPath}`);

    // -------------------------------------------------------------
    // Step 3: Create Target Database `worshipflow`
    // -------------------------------------------------------------
    console.log(`\n🏗️ Step 3: Creating target database "${config.targetDb}" with utf8mb4_unicode_ci...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`   ✅ Database "${config.targetDb}" created / verified.`);

    // -------------------------------------------------------------
    // Step 4: Recreate Schema in `worshipflow`
    // -------------------------------------------------------------
    console.log('📐 Step 4: Creating tables and views with structured JSON support in target database...');

    // 4.1 Labels Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${config.targetDb}\`.\`labels\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`color\` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#3b82f6',
        \`instrument\` enum('GUITAR','PIANO','UKULELE','BASS','MANDOLIN','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`name\` (\`name\`),
        KEY \`idx_labels_name\` (\`name\`),
        KEY \`idx_labels_instrument\` (\`instrument\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WorshipFlow song categorization labels';
    `);

    // 4.2 Songs Table (with content_json JSON column)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${config.targetDb}\`.\`songs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`artist\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`song_key\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`capo\` tinyint DEFAULT '0',
        \`tempo\` smallint DEFAULT NULL,
        \`difficulty\` enum('BEGINNER','INTERMEDIATE','ADVANCED') COLLATE utf8mb4_unicode_ci DEFAULT 'BEGINNER',
        \`content\` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
        \`content_json\` json DEFAULT NULL,
        \`notes\` text COLLATE utf8mb4_unicode_ci,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_songs_title\` (\`title\`),
        KEY \`idx_songs_artist\` (\`artist\`),
        KEY \`idx_songs_difficulty\` (\`difficulty\`),
        KEY \`idx_songs_created_at\` (\`created_at\`),
        KEY \`idx_songs_updated_at\` (\`updated_at\`),
        FULLTEXT KEY \`idx_songs_content\` (\`content\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WorshipFlow songs table with chord content, metadata, and structured JSON';
    `);

    // 4.3 Song Labels Junction Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${config.targetDb}\`.\`song_labels\` (
        \`song_id\` int NOT NULL,
        \`label_id\` int NOT NULL,
        PRIMARY KEY (\`song_id\`,\`label_id\`),
        KEY \`idx_song_labels_song_id\` (\`song_id\`),
        KEY \`idx_song_labels_label_id\` (\`label_id\`),
        CONSTRAINT \`worshipflow_song_labels_ibfk_1\` FOREIGN KEY (\`song_id\`) REFERENCES \`${config.targetDb}\`.\`songs\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`worshipflow_song_labels_ibfk_2\` FOREIGN KEY (\`label_id\`) REFERENCES \`${config.targetDb}\`.\`labels\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Many-to-many relationship between songs and labels';
    `);

    // 4.4 Setlists Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${config.targetDb}\`.\`setlists\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`description\` text COLLATE utf8mb4_unicode_ci,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WorshipFlow live setlists';
    `);

    // 4.5 Setlist Songs Junction Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${config.targetDb}\`.\`setlist_songs\` (
        \`setlist_id\` int NOT NULL,
        \`song_id\` int NOT NULL,
        \`position\` int NOT NULL DEFAULT '0',
        \`transpose_offset\` int NOT NULL DEFAULT '0',
        PRIMARY KEY (\`setlist_id\`,\`song_id\`),
        KEY \`idx_setlist_songs_song\` (\`song_id\`),
        CONSTRAINT \`worshipflow_setlist_songs_ibfk_1\` FOREIGN KEY (\`setlist_id\`) REFERENCES \`${config.targetDb}\`.\`setlists\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`worshipflow_setlist_songs_ibfk_2\` FOREIGN KEY (\`song_id\`) REFERENCES \`${config.targetDb}\`.\`songs\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WorshipFlow setlist song order and transpose settings';
    `);

    // 4.6 Views
    await connection.query(`
      CREATE OR REPLACE VIEW \`${config.targetDb}\`.\`labels_with_counts\` AS
      SELECT l.*, COUNT(sl.song_id) as song_count
      FROM \`${config.targetDb}\`.\`labels\` l
      LEFT JOIN \`${config.targetDb}\`.\`song_labels\` sl ON l.id = sl.label_id
      GROUP BY l.id
      ORDER BY l.name;
    `);

    await connection.query(`
      CREATE OR REPLACE VIEW \`${config.targetDb}\`.\`songs_with_labels\` AS
      SELECT s.*,
        GROUP_CONCAT(l.name ORDER BY l.name SEPARATOR ', ') as label_names,
        GROUP_CONCAT(l.id ORDER BY l.name SEPARATOR ',') as label_ids
      FROM \`${config.targetDb}\`.\`songs\` s
      LEFT JOIN \`${config.targetDb}\`.\`song_labels\` sl ON s.id = sl.song_id
      LEFT JOIN \`${config.targetDb}\`.\`labels\` l ON sl.label_id = l.id
      GROUP BY s.id;
    `);

    console.log('   ✅ All tables and views created successfully.');

    // -------------------------------------------------------------
    // Step 5: Copy Data and Populate Structured JSON Content
    // -------------------------------------------------------------
    console.log('\n🚚 Step 5: Migrating existing records into WorshipFlow...');

    // 5.1 Labels
    const [sourceLabels] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`labels\``)) as [any[], any];
    for (const lbl of sourceLabels) {
      await connection.query(
        `INSERT INTO \`${config.targetDb}\`.\`labels\` (id, name, color, instrument, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), color=VALUES(color), instrument=VALUES(instrument)`,
        [lbl.id, lbl.name, lbl.color, lbl.instrument, lbl.created_at]
      );
    }
    console.log(`   ✅ Migrated ${sourceLabels.length} labels.`);

    // 5.2 Songs (Compute structured JSON for each song)
    const [sourceSongs] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`songs\``)) as [any[], any];
    for (const s of sourceSongs) {
      const sections = parseRawToStructuredSections(s.content);
      const contentJson = JSON.stringify({
        format: 'worshipflow-song',
        version: 1,
        sections,
      });

      await connection.query(
        `INSERT INTO \`${config.targetDb}\`.\`songs\`
         (id, title, artist, song_key, capo, tempo, difficulty, content, content_json, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title=VALUES(title),
           artist=VALUES(artist),
           song_key=VALUES(song_key),
           capo=VALUES(capo),
           tempo=VALUES(tempo),
           difficulty=VALUES(difficulty),
           content=VALUES(content),
           content_json=VALUES(content_json),
           notes=VALUES(notes)`,
        [
          s.id,
          s.title,
          s.artist,
          s.song_key,
          s.capo,
          s.tempo,
          s.difficulty,
          s.content,
          contentJson,
          s.notes,
          s.created_at,
          s.updated_at,
        ]
      );
    }
    console.log(`   ✅ Migrated ${sourceSongs.length} songs with structured JSON content.`);

    // 5.3 Song Labels
    const [sourceSongLabels] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`song_labels\``)) as [any[], any];
    for (const sl of sourceSongLabels) {
      await connection.query(
        `INSERT INTO \`${config.targetDb}\`.\`song_labels\` (song_id, label_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE song_id=VALUES(song_id)`,
        [sl.song_id, sl.label_id]
      );
    }
    console.log(`   ✅ Migrated ${sourceSongLabels.length} song-label associations.`);

    // 5.4 Setlists
    const [sourceSetlists] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`setlists\``)) as [any[], any];
    for (const st of sourceSetlists) {
      await connection.query(
        `INSERT INTO \`${config.targetDb}\`.\`setlists\` (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
        [st.id, st.name, st.description, st.created_at, st.updated_at]
      );
    }
    console.log(`   ✅ Migrated ${sourceSetlists.length} setlists.`);

    // 5.5 Setlist Songs
    const [sourceSetlistSongs] = (await connection.query(`SELECT * FROM \`${config.sourceDb}\`.\`setlist_songs\``)) as [any[], any];
    for (const ss of sourceSetlistSongs) {
      await connection.query(
        `INSERT INTO \`${config.targetDb}\`.\`setlist_songs\` (setlist_id, song_id, position, transpose_offset)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE position=VALUES(position), transpose_offset=VALUES(transpose_offset)`,
        [ss.setlist_id, ss.song_id, ss.position, ss.transpose_offset]
      );
    }
    console.log(`   ✅ Migrated ${sourceSetlistSongs.length} setlist song records.`);

    // -------------------------------------------------------------
    // Step 6: Verification & Row Count Comparison
    // -------------------------------------------------------------
    console.log('\n🔍 Step 6: Verifying data integrity between databases...');
    const tablesToVerify = ['labels', 'songs', 'song_labels', 'setlists', 'setlist_songs'];
    let allMatched = true;

    for (const tableName of tablesToVerify) {
      const [srcCountRes] = (await connection.query(`SELECT COUNT(*) as count FROM \`${config.sourceDb}\`.\`${tableName}\``)) as [any[], any];
      const [tgtCountRes] = (await connection.query(`SELECT COUNT(*) as count FROM \`${config.targetDb}\`.\`${tableName}\``)) as [any[], any];

      const srcCount = srcCountRes[0].count;
      const tgtCount = tgtCountRes[0].count;

      if (srcCount === tgtCount) {
        console.log(`   ✅ Table "${tableName}": ${srcCount} rows (exact match)`);
      } else {
        console.error(`   ❌ Table "${tableName}" MISMATCH: source has ${srcCount}, target has ${tgtCount}`);
        allMatched = false;
      }
    }

    if (!allMatched) {
      throw new Error('Data verification failed! One or more tables did not match row counts.');
    }

    console.log('\n🎉 DATABASE MIGRATION TO "worshipflow" COMPLETED SUCCESSFULLY!');
    console.log(`🛡️ Note: The original "${config.sourceDb}" database is preserved intact.`);
  } finally {
    await connection.end();
  }
}

runMigration().catch((err) => {
  console.error('\n❌ Migration failed with error:', err);
  process.exit(1);
});
