import type { PoolConnection } from 'mysql2/promise';
import { db } from '../../common/database/db_client.js';
import { AppError } from '../../common/utils/app_error.js';
import { songRepository } from '../../songs/repository/song.repository.js';
import type {
  Setlist,
  SetlistWithSongs,
  CreateSetlistData,
  UpdateSetlistData,
  SetlistSongItem,
} from '../types/setlist.types.js';

interface SetlistRow {
  id: number;
  name: string;
  description: string | null;
  song_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class SetlistRepository {
  async findAll(): Promise<Setlist[]> {
    try {
      const sql = `
        SELECT s.id, s.name, s.description, s.created_at, s.updated_at,
               COUNT(ss.song_id) as song_count
        FROM setlists s
        LEFT JOIN setlist_songs ss ON s.id = ss.setlist_id
        GROUP BY s.id
        ORDER BY s.updated_at DESC
      `;
      const rows = await db.query<SetlistRow>(sql);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        songCount: Number(r.song_count || 0),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    } catch (error) {
      console.error('Error finding setlists:', error);
      throw AppError.databaseError('Failed to retrieve setlists');
    }
  }

  async findByName(name: string): Promise<Setlist | null> {
    try {
      const sql = `SELECT * FROM setlists WHERE name = ? LIMIT 1`;
      const rows = await db.query<any>(sql, [name.trim()]);
      if (!rows || rows.length === 0) {
        return null;
      }
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        songCount: 0,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    } catch (error) {
      console.error(`Error finding setlist by name '${name}':`, error);
      throw AppError.databaseError('Failed to find setlist by name');
    }
  }

  async findById(id: number): Promise<SetlistWithSongs | null> {
    try {
      const setlistSql = `SELECT * FROM setlists WHERE id = ?`;
      const setlistRows = await db.query<any>(setlistSql, [id]);
      if (!setlistRows || setlistRows.length === 0) {
        return null;
      }
      const s = setlistRows[0];

      // Get associated songs with their position and transpose_offset
      const itemsSql = `
        SELECT song_id, position, transpose_offset
        FROM setlist_songs
        WHERE setlist_id = ?
        ORDER BY position ASC
      `;
      const itemRows = await db.query<{ song_id: number; position: number; transpose_offset: number }>(
        itemsSql,
        [id]
      );

      const songs: SetlistSongItem[] = [];
      for (const item of itemRows) {
        const song = await songRepository.findById(item.song_id);
        if (song) {
          songs.push({
            song,
            position: item.position,
            transposeOffset: item.transpose_offset || 0,
          });
        }
      }

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        songCount: songs.length,
        createdAt: new Date(s.created_at).toISOString(),
        updatedAt: new Date(s.updated_at).toISOString(),
        songs,
      };
    } catch (error) {
      console.error(`Error finding setlist #${id}:`, error);
      throw AppError.databaseError('Failed to retrieve setlist');
    }
  }

  async create(data: CreateSetlistData): Promise<Setlist> {
    try {
      const sql = `INSERT INTO setlists (name, description) VALUES (?, ?)`;
      const [result] = (await db.execute(sql, [data.name, data.description ?? null])) as any;
      const created = await this.findById(result.insertId);
      if (!created) {
        throw AppError.internalServerError('Setlist created but could not be loaded');
      }
      return created;
    } catch (error) {
      console.error('Error creating setlist:', error);
      if (error instanceof AppError) throw error;
      throw AppError.databaseError('Failed to create setlist');
    }
  }

  async update(id: number, data: UpdateSetlistData): Promise<Setlist> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
      }
      if (updates.length > 0) {
        params.push(id);
        await db.execute(`UPDATE setlists SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      const updated = await this.findById(id);
      if (!updated) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      return updated;
    } catch (error) {
      console.error(`Error updating setlist #${id}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.databaseError('Failed to update setlist');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const [result] = (await db.execute('DELETE FROM setlists WHERE id = ?', [id])) as any;
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting setlist #${id}:`, error);
      throw AppError.databaseError('Failed to delete setlist');
    }
  }

  async addSong(
    setlistId: number,
    songId: number,
    transposeOffset: number = 0,
    position?: number
  ): Promise<void> {
    try {
      let insertPos = position;
      if (insertPos === undefined || insertPos === null) {
        // Find current max position
        const posSql = `SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM setlist_songs WHERE setlist_id = ?`;
        const posRows = await db.query<{ next_pos: number }>(posSql, [setlistId]);
        insertPos = posRows[0]?.next_pos ?? 0;
      }

      const sql = `
        INSERT INTO setlist_songs (setlist_id, song_id, position, transpose_offset)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          position = VALUES(position),
          transpose_offset = VALUES(transpose_offset)
      `;
      await db.execute(sql, [setlistId, songId, insertPos, transposeOffset]);
    } catch (error) {
      console.error(`Error adding song #${songId} to setlist #${setlistId}:`, error);
      throw AppError.databaseError('Failed to add song to setlist');
    }
  }

  async removeSong(setlistId: number, songId: number): Promise<void> {
    try {
      await db.execute('DELETE FROM setlist_songs WHERE setlist_id = ? AND song_id = ?', [
        setlistId,
        songId,
      ]);
    } catch (error) {
      console.error(`Error removing song #${songId} from setlist #${setlistId}:`, error);
      throw AppError.databaseError('Failed to remove song from setlist');
    }
  }

  async reorderSongs(setlistId: number, songIds: number[]): Promise<void> {
    const connection: PoolConnection = await db.beginTransaction();
    try {
      for (let i = 0; i < songIds.length; i++) {
        await connection.execute(
          'UPDATE setlist_songs SET position = ? WHERE setlist_id = ? AND song_id = ?',
          [i, setlistId, songIds[i]]
        );
      }
      await db.commitTransaction(connection);
    } catch (error) {
      await db.rollbackTransaction(connection);
      console.error(`Error reordering setlist #${setlistId}:`, error);
      throw AppError.databaseError('Failed to reorder setlist songs');
    }
  }
}

export const setlistRepository = new SetlistRepository();
