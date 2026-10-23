import { Request, Response } from 'express';
import { songRepository } from '../repository/song.repository.js';
import { labelRepository } from '../../labels/repository/label.repository.js';
import {
  createSongSchema,
  updateSongSchema,
  songQuerySchema,
} from '../types/song.types.js';
import {
  buildWorshipFlowSongDocument,
  structuredSectionsToRaw,
} from '../utils/song_converter.js';
import { AppError } from '../../common/utils/app_error.js';
import { createSuccessResponse } from '../../common/types/api.types.js';
import { HTTP_STATUS } from '../../common/utils/status_codes.js';

export class SongController {
  async getSongs(req: Request, res: Response) {
    try {
      const query = songQuerySchema.parse(req.query);
      const songs = await songRepository.findAll(query);
      const total = await songRepository.getTotalCount(query);

      const totalPages = Math.ceil(total / query.limit);
      const hasNext = query.page < totalPages;
      const hasPrev = query.page > 1;

      res.status(HTTP_STATUS.OK).json(createSuccessResponse(
        songs,
        'Songs retrieved successfully',
        total,
        {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        }
      ));
    } catch (error: any) {
      if (error instanceof AppError || error?.name === 'ZodError') throw error;
      console.error('Error in getSongs:', error);
      throw AppError.internalServerError('Failed to retrieve songs');
    }
  }

  async getSongById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid song ID');
      }

      const song = await songRepository.findById(id);
      if (!song) {
        throw AppError.notFound(`Song with ID ${id} not found`);
      }

      res.status(HTTP_STATUS.OK).json(createSuccessResponse(song, 'Song retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(`Error in getSongById (${req.params.id}):`, error);
      throw AppError.internalServerError('Failed to retrieve song');
    }
  }

  async createSong(req: Request, res: Response) {
    try {
      const validatedData = createSongSchema.parse(req.body);
      const createdSong = await songRepository.create(validatedData);

      res.status(HTTP_STATUS.CREATED).json(createSuccessResponse(
        createdSong,
        'Song created successfully'
      ));
    } catch (error: any) {
      if (error instanceof AppError || error?.name === 'ZodError') throw error;
      console.error('Error in createSong:', error);
      throw AppError.internalServerError('Failed to create song');
    }
  }

  async updateSong(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid song ID');
      }

      const validatedData = updateSongSchema.parse(req.body);
      const updatedSong = await songRepository.update(id, validatedData);

      res.status(HTTP_STATUS.OK).json(createSuccessResponse(
        updatedSong,
        'Song updated successfully'
      ));
    } catch (error: any) {
      if (error instanceof AppError || error?.name === 'ZodError') throw error;
      console.error(`Error in updateSong (${req.params.id}):`, error);
      throw AppError.internalServerError('Failed to update song');
    }
  }

  async deleteSong(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid song ID');
      }

      const deleted = await songRepository.delete(id);
      if (!deleted) {
        throw AppError.notFound(`Song with ID ${id} not found`);
      }

      res.status(HTTP_STATUS.OK).json(createSuccessResponse(
        { id },
        'Song deleted successfully'
      ));
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(`Error in deleteSong (${req.params.id}):`, error);
      throw AppError.internalServerError('Failed to delete song');
    }
  }

  async exportSong(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid song ID');
      }

      const song = await songRepository.findById(id);
      if (!song) {
        throw AppError.notFound(`Song with ID ${id} not found`);
      }

      const doc = buildWorshipFlowSongDocument(song);

      const download = req.query.download === 'true';
      if (download) {
        const safeTitle = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'song';
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.worshipflow"`);
        res.setHeader('Content-Type', 'application/json');
      }

      res.status(HTTP_STATUS.OK).json(doc);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(`Error exporting song (${req.params.id}):`, error);
      throw AppError.internalServerError('Failed to export song');
    }
  }

  async importSongs(req: Request, res: Response) {
    try {
      const payload = req.body;
      const conflictMode = (req.body.conflictMode || req.query.conflictMode || 'keep_both') as 'skip' | 'overwrite' | 'keep_both';

      let items: any[] = [];
      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.format === 'worshipflow-song' && payload.song) {
        items = [payload];
      } else if (Array.isArray(payload?.songs)) {
        items = payload.songs;
      } else if (payload?.title) {
        items = [payload];
      } else {
        throw AppError.badRequest('Invalid import format: expected a song document or list of songs');
      }

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        songs: [] as any[],
      };

      for (const item of items) {
        const songData = item.format === 'worshipflow-song' && item.song ? item.song : item;

        let content = songData.content || '';
        if (!content && Array.isArray(songData.sections)) {
          content = structuredSectionsToRaw(songData.sections);
        }

        if (!songData.title || !content) {
          results.skipped++;
          continue;
        }

        const labelIds: number[] = [];
        const tags = Array.isArray(songData.tags)
          ? songData.tags
          : Array.isArray(songData.labels)
          ? songData.labels.map((l: any) => (typeof l === 'string' ? l : l.name))
          : [];

        for (const tag of tags) {
          if (!tag) continue;
          let label = await labelRepository.findByName(tag);
          if (!label) {
            try {
              label = await labelRepository.create({ name: tag, color: '#198754', instrument: null });
            } catch {
              // Might already exist
              label = await labelRepository.findByName(tag);
            }
          }
          if (label && !labelIds.includes(label.id)) {
            labelIds.push(label.id);
          }
        }

        const existing = await songRepository.findByTitle(songData.title);

        if (existing) {
          if (conflictMode === 'skip') {
            results.skipped++;
            continue;
          } else if (conflictMode === 'overwrite') {
            const updated = await songRepository.update(existing.id, {
              title: songData.title,
              artist: songData.artist ?? null,
              songKey: songData.songKey ?? null,
              capo: songData.capo ?? 0,
              tempo: songData.tempo ?? null,
              difficulty: songData.difficulty ?? existing.difficulty,
              content,
              notes: songData.notes ?? null,
              labelIds: labelIds.length > 0 ? labelIds : undefined,
            });
            results.updated++;
            results.songs.push(updated);
            continue;
          } else {
            songData.title = `${songData.title} (Imported)`;
          }
        }

        const created = await songRepository.create({
          title: songData.title,
          artist: songData.artist ?? null,
          songKey: songData.songKey ?? null,
          capo: songData.capo ?? 0,
          tempo: songData.tempo ?? null,
          difficulty: songData.difficulty ?? 'BEGINNER',
          content,
          notes: songData.notes ?? null,
          labelIds,
        });

        results.imported++;
        results.songs.push(created);
      }

      res.status(HTTP_STATUS.OK).json(createSuccessResponse(
        results,
        `Import completed: ${results.imported} created, ${results.updated} updated, ${results.skipped} skipped.`
      ));
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error importing songs:', error);
      throw AppError.internalServerError('Failed to import songs');
    }
  }
}

export const songController = new SongController();
