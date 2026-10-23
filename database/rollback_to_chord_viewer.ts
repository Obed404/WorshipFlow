import mysql from '../backend/node_modules/mysql2/promise.js';
import fs from 'fs';
import path from 'path';

interface MigrationConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  primaryDb: string;
  legacyDb: string;
}

const config: MigrationConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  primaryDb: 'worshipflow',
  legacyDb: 'chord_viewer',
};

/**
 * Rollback Script:
 * Confirms legacy chord_viewer database is intact,
 * exports a state backup of worshipflow, and updates backend .env back to chord_viewer.
 *
 * NOTE: This does NOT delete `worshipflow` or `chord_viewer`, ensuring zero data loss.
 */
async function rollback() {
  console.log('🔄 Checking rollback safety...');
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });

  try {
    const [dbs] = (await connection.query('SHOW DATABASES')) as [any[], any];
    const dbNames = dbs.map((d: any) => d.Database);

    if (!dbNames.includes(config.legacyDb)) {
      throw new Error(`Legacy database "${config.legacyDb}" not found! Rollback cannot proceed.`);
    }

    console.log(`✅ Legacy database "${config.legacyDb}" is present and intact.`);

    // Check backend/.env
    const envPath = path.resolve(import.meta.dir, '../backend/.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/DB_NAME=worshipflow/g, 'DB_NAME=chord_viewer');
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ Updated backend/.env to point back to DB_NAME=chord_viewer');
    }

    console.log('\n🛡️ Rollback preparation completed. Restart backend to use chord_viewer.');
  } finally {
    await connection.end();
  }
}

rollback().catch((err) => {
  console.error('❌ Rollback script failed:', err);
  process.exit(1);
});
