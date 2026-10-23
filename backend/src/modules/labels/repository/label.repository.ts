import { db } from '../../common/database/db_client.js';
import { AppError } from '../../common/utils/app_error.js';
import type {
  LabelRow,
  LabelWithCountRow,
  CreateLabelData,
  UpdateLabelData,
  LabelQueryData,
} from '../types/label.types.js';

export class LabelRepository {
  async findAll(query: Partial<LabelQueryData> = {}): Promise<LabelWithCountRow[]> {
    try {
      const { search, instrument, sort = 'name', order = 'ASC', page = 1, limit = 100 } = query;
      const offset = (page - 1) * limit;

      let sql = `
        SELECT 
          l.*,
          COUNT(sl.song_id) as song_count
        FROM labels l
        LEFT JOIN song_labels sl ON l.id = sl.label_id
      `;

      const whereConditions: string[] = [];
      const params: any[] = [];

      // Add search filter
      if (search) {
        whereConditions.push('l.name LIKE ?');
        params.push(`%${search}%`);
      }

      // Add instrument filter
      if (instrument) {
        whereConditions.push('l.instrument = ?');
        params.push(instrument);
      }

      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Add GROUP BY
      sql += ' GROUP BY l.id';

      // Validate sort field to prevent SQL injection
      const validSortFields = ['name', 'created_at', 'song_count'];
      const sortField = validSortFields.includes(sort) ? sort : 'name';
      
      // Validate order
      const validOrder = order === 'DESC' ? 'DESC' : 'ASC';
      
      sql += ` ORDER BY ${sortField} ${validOrder}`;

      // Add pagination
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.query<LabelWithCountRow>(sql, params);
      return rows;
    } catch (error) {
      console.error('Error finding labels:', error);
      throw AppError.databaseError('Failed to retrieve labels');
    }
  }

  async findById(id: number): Promise<LabelRow | null> {
    try {
      const sql = 'SELECT * FROM labels WHERE id = ?';
      const rows = await db.query<LabelRow>(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error finding label with id ${id}:`, error);
      throw AppError.databaseError('Failed to retrieve label');
    }
  }

  async findByName(name: string): Promise<LabelRow | null> {
    try {
      const sql = 'SELECT * FROM labels WHERE name = ?';
      const rows = await db.query<LabelRow>(sql, [name]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error finding label with name "${name}":`, error);
      throw AppError.databaseError('Failed to retrieve label by name');
    }
  }

  async create(data: CreateLabelData): Promise<LabelRow> {
    const connection = await db.beginTransaction();
    
    try {
      // Check if label with same name already exists
      const existingLabel = await this.findByName(data.name);
      if (existingLabel) {
        throw AppError.conflict(`Label with name "${data.name}" already exists`);
      }

      const sql = `
        INSERT INTO labels (name, color, instrument)
        VALUES (?, ?, ?)
      `;
      
      const params = [data.name, data.color, data.instrument];
      const [result] = await connection.execute(sql, params);
      
      const insertId = (result as any).insertId;
      
      await db.commitTransaction(connection);
      
      // Return the created label
      const createdLabel = await this.findById(insertId);
      if (!createdLabel) {
        throw AppError.internalServerError('Failed to retrieve created label');
      }
      
      return createdLabel;
    } catch (error) {
      await db.rollbackTransaction(connection);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      console.error('Error creating label:', error);
      throw AppError.databaseError('Failed to create label');
    }
  }

  async update(id: number, data: UpdateLabelData): Promise<LabelRow> {
    const connection = await db.beginTransaction();
    
    try {
      // Check if label exists
      const existingLabel = await this.findById(id);
      if (!existingLabel) {
        throw AppError.notFound(`Label with id ${id} not found`);
      }

      // Check if new name conflicts with another label
      if (data.name && data.name !== existingLabel.name) {
        const labelWithSameName = await this.findByName(data.name);
        if (labelWithSameName) {
          throw AppError.conflict(`Label with name "${data.name}" already exists`);
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        params.push(data.name);
      }

      if (data.color !== undefined) {
        updateFields.push('color = ?');
        params.push(data.color);
      }

      if (data.instrument !== undefined) {
        updateFields.push('instrument = ?');
        params.push(data.instrument);
      }

      if (updateFields.length === 0) {
        throw AppError.badRequest('No fields to update');
      }

      params.push(id);
      const sql = `UPDATE labels SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await connection.execute(sql, params);
      await db.commitTransaction(connection);
      
      // Return updated label
      const updatedLabel = await this.findById(id);
      if (!updatedLabel) {
        throw AppError.internalServerError('Failed to retrieve updated label');
      }
      
      return updatedLabel;
    } catch (error) {
      await db.rollbackTransaction(connection);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      console.error(`Error updating label with id ${id}:`, error);
      throw AppError.databaseError('Failed to update label');
    }
  }

  async delete(id: number): Promise<boolean> {
    const connection = await db.beginTransaction();
    
    try {
      // Check if label exists
      const existingLabel = await this.findById(id);
      if (!existingLabel) {
        throw AppError.notFound(`Label with id ${id} not found`);
      }

      // Delete the label (song_labels will cascade)
      const sql = 'DELETE FROM labels WHERE id = ?';
      const [result] = await connection.execute(sql, [id]);
      
      const affectedRows = (result as any).affectedRows;
      
      await db.commitTransaction(connection);
      
      return affectedRows > 0;
    } catch (error) {
      await db.rollbackTransaction(connection);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      console.error(`Error deleting label with id ${id}:`, error);
      throw AppError.databaseError('Failed to delete label');
    }
  }

  async getTotalCount(query: LabelQueryData): Promise<number> {
    try {
      const { search, instrument } = query;

      let sql = 'SELECT COUNT(DISTINCT l.id) as total FROM labels l';
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Add search filter
      if (search) {
        whereConditions.push('l.name LIKE ?');
        params.push(`%${search}%`);
      }

      // Add instrument filter
      if (instrument) {
        whereConditions.push('l.instrument = ?');
        params.push(instrument);
      }

      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }

      const rows = await db.query<{ total: number }>(sql, params);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error('Error getting label count:', error);
      throw AppError.databaseError('Failed to count labels');
    }
  }

  async findLabelsBySongId(songId: number): Promise<LabelRow[]> {
    try {
      const sql = `
        SELECT l.* 
        FROM labels l
        INNER JOIN song_labels sl ON l.id = sl.label_id
        WHERE sl.song_id = ?
        ORDER BY l.name
      `;
      
      const rows = await db.query<LabelRow>(sql, [songId]);
      return rows;
    } catch (error) {
      console.error(`Error finding labels for song ${songId}:`, error);
      throw AppError.databaseError('Failed to retrieve labels for song');
    }
  }

  async associateLabelWithSong(labelId: number, songId: number): Promise<boolean> {
    try {
      const sql = 'INSERT IGNORE INTO song_labels (label_id, song_id) VALUES (?, ?)';
      const [result] = await db.execute(sql, [labelId, songId]);
      
      const affectedRows = (result as any).affectedRows;
      return affectedRows > 0;
    } catch (error) {
      console.error(`Error associating label ${labelId} with song ${songId}:`, error);
      throw AppError.databaseError('Failed to associate label with song');
    }
  }

  async removeLabelFromSong(labelId: number, songId: number): Promise<boolean> {
    try {
      const sql = 'DELETE FROM song_labels WHERE label_id = ? AND song_id = ?';
      const [result] = await db.execute(sql, [labelId, songId]);
      
      const affectedRows = (result as any).affectedRows;
      return affectedRows > 0;
    } catch (error) {
      console.error(`Error removing label ${labelId} from song ${songId}:`, error);
      throw AppError.databaseError('Failed to remove label from song');
    }
  }
}

export const labelRepository = new LabelRepository();