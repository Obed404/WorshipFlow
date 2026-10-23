import type { PoolConnection } from 'mysql2/promise';
import { db } from '../../common/database/db_client.js';
import { AppError } from '../../common/utils/app_error.js';
import { songLabelRepository } from './song_label.repository.js';
import { mapLabelRowToLabel } from '../../labels/types/label.types.js';
import { parseRawToStructuredSections } from '../utils/song_converter.js';
import {
  type SongRow,
  type Song,
  type CreateSongData,
  type UpdateSongData,
  type SongQueryData,
  mapSongRowToSong,
} from '../types/song.types.js';

export class SongRepository {
  /**
   * Build WHERE clause and parameter array for song queries
   * Filtering semantics for labelIds: ANY match (OR filter) — songs containing ANY of the specified labels
   */
  private buildWhereClause(query: SongQueryData): { whereSql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push('(s.title LIKE ? OR s.artist LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    if (query.labelIds && query.labelIds.length > 0) {
      const placeholders = query.labelIds.map(() => '?').join(',');
      conditions.push(`s.id IN (SELECT sl.song_id FROM song_labels sl WHERE sl.label_id IN (${placeholders}))`);
      params.push(...query.labelIds);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  /**
   * Find songs with filtering, pagination, and sorting
   */
  async findAll(query: SongQueryData): Promise<Song[]> {
    try {
      const { whereSql, params } = this.buildWhereClause(query);
      
      const validSortFields = ['title', 'artist', 'created_at', 'updated_at'];
      const sortField = validSortFields.includes(query.sort) ? `s.${query.sort}` : 's.updated_at';
      const order = query.order === 'ASC' ? 'ASC' : 'DESC';

      const offset = (query.page - 1) * query.limit;

      const sql = `
        SELECT s.*
        FROM songs s
        ${whereSql}
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, query.limit, offset];
      const rows = await db.query<SongRow>(sql, queryParams);

      if (rows.length === 0) {
        return [];
      }

      // Fetch labels for all songs in batch
      const songIds = rows.map(r => r.id);
      const labelsMap = await songLabelRepository.getLabelsForSongs(songIds);

      return rows.map(row => {
        const labelRows = labelsMap.get(row.id) || [];
        const labels = labelRows.map(mapLabelRowToLabel);
        return mapSongRowToSong(row, labels);
      });
    } catch (error) {
      console.error('Error finding songs:', error);
      throw AppError.databaseError('Failed to retrieve songs');
    }
  }

  /**
   * Get total count of matching songs for pagination
   */
  async getTotalCount(query: SongQueryData): Promise<number> {
    try {
      const { whereSql, params } = this.buildWhereClause(query);
      const sql = `SELECT COUNT(*) as count FROM songs s ${whereSql}`;
      const result = await db.query<{ count: number }>(sql, params);
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error getting song count:', error);
      throw AppError.databaseError('Failed to count songs');
    }
  }

  /**
   * Find single song by ID with associated labels
   */
  async findById(id: number): Promise<Song | null> {
    try {
      const sql = 'SELECT * FROM songs WHERE id = ?';
      const rows = await db.query<SongRow>(sql, [id]);
      if (!rows || rows.length === 0) {
        return null;
      }

      const labelRows = await songLabelRepository.getLabelsBySongId(id);
      const labels = labelRows.map(mapLabelRowToLabel);
      return mapSongRowToSong(rows[0], labels);
    } catch (error) {
      console.error(`Error finding song #${id}:`, error);
      throw AppError.databaseError('Failed to retrieve song');
    }
  }

  /**
   * Find single song by Title (case-insensitive)
   */
  async findByTitle(title: string): Promise<Song | null> {
    try {
      const sql = 'SELECT * FROM songs WHERE LOWER(title) = LOWER(?) LIMIT 1';
      const rows = await db.query<SongRow>(sql, [title.trim()]);
      if (!rows || rows.length === 0) {
        return null;
      }

      const labelRows = await songLabelRepository.getLabelsBySongId(rows[0].id);
      const labels = labelRows.map(mapLabelRowToLabel);
      return mapSongRowToSong(rows[0], labels);
    } catch (error) {
      console.error(`Error finding song by title "${title}":`, error);
      throw AppError.databaseError('Failed to retrieve song by title');
    }
  }

  /**
   * Create song with associated labels inside an atomic transaction
   */
  async create(data: CreateSongData): Promise<Song> {
    const connection: PoolConnection = await db.beginTransaction();
    try {
      const sections = parseRawToStructuredSections(data.content);
      const contentJson = JSON.stringify({
        format: 'worshipflow-song',
        version: 1,
        sections,
      });

      let songId: number;

      try {
        const insertSql = `
          INSERT INTO songs (title, artist, song_key, capo, tempo, difficulty, content, content_json, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [insertResult] = await connection.execute(insertSql, [
          data.title,
          data.artist ?? null,
          data.songKey ?? null,
          data.capo ?? 0,
          data.tempo ?? null,
          data.difficulty ?? 'BEGINNER',
          data.content,
          contentJson,
          data.notes ?? null,
        ]) as any;

        songId = insertResult.insertId;
      } catch (insertError: any) {
        // Fallback if legacy database schema lacks content_json or difficulty
        if (insertError.errno === 1054 || insertError.code === 'ER_BAD_FIELD_ERROR') {
          const fallbackSql = `
            INSERT INTO songs (title, artist, song_key, capo, tempo, content, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          const [fallbackResult] = await connection.execute(fallbackSql, [
            data.title,
            data.artist ?? null,
            data.songKey ?? null,
            data.capo ?? 0,
            data.tempo ?? null,
            data.content,
            data.notes ?? null,
          ]) as any;
          songId = fallbackResult.insertId;
        } else {
          throw insertError;
        }
      }

      // Associate labels
      if (data.labelIds && data.labelIds.length > 0) {
        await songLabelRepository.setSongLabels(connection, songId, data.labelIds);
      }

      // Commit transaction
      await db.commitTransaction(connection);

      // Fetch created record with labels
      const createdSong = await this.findById(songId);
      if (!createdSong) {
        throw AppError.internalServerError('Song was created but could not be loaded');
      }
      return createdSong;
    } catch (error) {
      await db.rollbackTransaction(connection);
      console.error('Error creating song, transaction rolled back:', error);
      if (error instanceof AppError) throw error;
      throw AppError.databaseError('Failed to create song');
    }
  }

  /**
   * Update song and associated labels inside an atomic transaction
   */
  async update(id: number, data: UpdateSongData): Promise<Song> {
    const connection: PoolConnection = await db.beginTransaction();
    try {
      // 1. Verify existence
      const [existing] = await connection.execute('SELECT id FROM songs WHERE id = ?', [id]) as any[];
      if (!existing || existing.length === 0) {
        throw AppError.notFound(`Song with ID ${id} not found`);
      }

      // 2. Build dynamic update statement
      const updates: string[] = [];
      const params: any[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
      }
      if (data.artist !== undefined) {
        updates.push('artist = ?');
        params.push(data.artist);
      }
      if (data.songKey !== undefined) {
        updates.push('song_key = ?');
        params.push(data.songKey);
      }
      if (data.capo !== undefined) {
        updates.push('capo = ?');
        params.push(data.capo);
      }
      if (data.tempo !== undefined) {
        updates.push('tempo = ?');
        params.push(data.tempo);
      }
      if (data.difficulty !== undefined) {
        updates.push('difficulty = ?');
        params.push(data.difficulty);
      }
      if (data.content !== undefined) {
        const sections = parseRawToStructuredSections(data.content);
        const contentJson = JSON.stringify({
          format: 'worshipflow-song',
          version: 1,
          sections,
        });
        updates.push('content = ?, content_json = ?');
        params.push(data.content, contentJson);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        params.push(data.notes);
      }

      if (updates.length > 0) {
        try {
          const updateSql = `UPDATE songs SET ${updates.join(', ')} WHERE id = ?`;
          params.push(id);
          await connection.execute(updateSql, params);
        } catch (updateError: any) {
          if (updateError.errno === 1054 || updateError.code === 'ER_BAD_FIELD_ERROR') {
            // Rebuild updates without content_json or difficulty if table lacks them
            const fallbackUpdates: string[] = [];
            const fallbackParams: any[] = [];
            if (data.title !== undefined) { fallbackUpdates.push('title = ?'); fallbackParams.push(data.title); }
            if (data.artist !== undefined) { fallbackUpdates.push('artist = ?'); fallbackParams.push(data.artist); }
            if (data.songKey !== undefined) { fallbackUpdates.push('song_key = ?'); fallbackParams.push(data.songKey); }
            if (data.capo !== undefined) { fallbackUpdates.push('capo = ?'); fallbackParams.push(data.capo); }
            if (data.tempo !== undefined) { fallbackUpdates.push('tempo = ?'); fallbackParams.push(data.tempo); }
            if (data.content !== undefined) { fallbackUpdates.push('content = ?'); fallbackParams.push(data.content); }
            if (data.notes !== undefined) { fallbackUpdates.push('notes = ?'); fallbackParams.push(data.notes); }
            if (fallbackUpdates.length > 0) {
              const fallbackSql = `UPDATE songs SET ${fallbackUpdates.join(', ')} WHERE id = ?`;
              fallbackParams.push(id);
              await connection.execute(fallbackSql, fallbackParams);
            }
          } else {
            throw updateError;
          }
        }
      }

      // 3. Update labels if provided
      if (data.labelIds !== undefined) {
        await songLabelRepository.setSongLabels(connection, id, data.labelIds);
      }

      await db.commitTransaction(connection);

      const updatedSong = await this.findById(id);
      if (!updatedSong) {
        throw AppError.internalServerError('Song was updated but could not be loaded');
      }
      return updatedSong;
    } catch (error) {
      await db.rollbackTransaction(connection);
      console.error(`Error updating song #${id}, transaction rolled back:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.databaseError('Failed to update song');
    }
  }

  /**
   * Delete song by ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      const [result] = await db.execute('DELETE FROM songs WHERE id = ?', [id]) as any;
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting song #${id}:`, error);
      throw AppError.databaseError('Failed to delete song');
    }
  }
}

export const songRepository = new SongRepository();
