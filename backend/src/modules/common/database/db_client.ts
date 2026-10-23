import { createPool, Pool, PoolConnection } from 'mysql2/promise';
import { env } from '../utils/env.js';

class DatabaseClient {
  private pool: Pool;

  constructor() {
    this.pool = createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      connectionLimit: env.DB_POOL_MAX,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: false,
      dateStrings: true,
      decimalNumbers: true,
    });
  }

  async getConnection(): Promise<PoolConnection> {
    return await this.pool.getConnection();
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }

  async execute(sql: string, params?: any[]): Promise<[any, any]> {
    return await this.pool.execute(sql, params);
  }

  async beginTransaction(): Promise<PoolConnection> {
    const connection = await this.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection: PoolConnection): Promise<void> {
    try {
      await connection.commit();
    } finally {
      connection.release();
    }
  }

  async rollbackTransaction(connection: PoolConnection): Promise<void> {
    try {
      await connection.rollback();
    } finally {
      connection.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [result] = await this.pool.execute('SELECT 1 as health_check');
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }
}

export const db = new DatabaseClient();