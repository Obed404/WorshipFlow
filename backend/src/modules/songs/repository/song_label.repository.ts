import type { PoolConnection } from 'mysql2/promise';
import { db } from '../../common/database/db_client.js';
import type { LabelRow } from '../../labels/types/label.types.js';

export class SongLabelRepository {
  /**
   * Get all labels associated with a song
   */
  async getLabelsBySongId(songId: number, connection?: PoolConnection): Promise<LabelRow[]> {
    const sql = `
      SELECT l.*
      FROM labels l
      JOIN song_labels sl ON l.id = sl.label_id
      WHERE sl.song_id = ?
      ORDER BY l.name ASC
    `;
    if (connection) {
      const [rows] = await connection.execute(sql, [songId]);
      return rows as LabelRow[];
    }
    return await db.query<LabelRow>(sql, [songId]);
  }

  /**
   * Get all labels for multiple song IDs in a single batch query
   */
  async getLabelsForSongs(songIds: number[]): Promise<Map<number, LabelRow[]>> {
    const map = new Map<number, LabelRow[]>();
    if (songIds.length === 0) return map;

    songIds.forEach(id => map.set(id, []));

    const placeholders = songIds.map(() => '?').join(',');
    const sql = `
      SELECT sl.song_id, l.*
      FROM labels l
      JOIN song_labels sl ON l.id = sl.label_id
      WHERE sl.song_id IN (${placeholders})
      ORDER BY l.name ASC
    `;

    const rows = await db.query<LabelRow & { song_id: number }>(sql, songIds);
    for (const row of rows) {
      const { song_id, ...label } = row;
      const list = map.get(song_id);
      if (list) {
        list.push(label as LabelRow);
      }
    }
    return map;
  }

  /**
   * Attach labels to a song inside a transaction
   */
  async setSongLabels(connection: PoolConnection, songId: number, labelIds: number[]): Promise<void> {
    // 1. Delete existing associations
    await connection.execute('DELETE FROM song_labels WHERE song_id = ?', [songId]);

    // 2. Insert new associations if any
    const uniqueIds = Array.from(new Set(labelIds)).filter(id => id > 0);
    if (uniqueIds.length > 0) {
      const values = uniqueIds.map(() => '(?, ?)').join(', ');
      const params: any[] = [];
      uniqueIds.forEach(labelId => {
        params.push(songId, labelId);
      });
      await connection.execute(`INSERT INTO song_labels (song_id, label_id) VALUES ${values}`, params);
    }
  }

  /**
   * Remove all label associations for a song
   */
  async removeLabelsBySongId(connection: PoolConnection, songId: number): Promise<void> {
    await connection.execute('DELETE FROM song_labels WHERE song_id = ?', [songId]);
  }
}

export const songLabelRepository = new SongLabelRepository();
