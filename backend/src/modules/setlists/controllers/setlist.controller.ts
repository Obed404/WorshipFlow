import type { Request, Response, NextFunction } from 'express';
import { setlistRepository } from '../repository/setlist.repository.js';
import { songRepository } from '../../songs/repository/song.repository.js';
import {
  createSetlistSchema,
  updateSetlistSchema,
  addSongToSetlistSchema,
  reorderSetlistSchema,
} from '../types/setlist.types.js';
import { createSuccessResponse } from '../../common/types/api.types.js';
import { AppError } from '../../common/utils/app_error.js';

export class SetlistController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const setlists = await setlistRepository.findAll();
      res.json(createSuccessResponse(setlists, 'Setlists retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid setlist ID');
      }
      const setlist = await setlistRepository.findById(id);
      if (!setlist) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      res.json(createSuccessResponse(setlist, 'Setlist retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createSetlistSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.badRequest('Validation failed', parsed.error.format());
      }
      const setlist = await setlistRepository.create(parsed.data);
      res.status(201).json(createSuccessResponse(setlist, 'Setlist created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid setlist ID');
      }
      const parsed = updateSetlistSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.badRequest('Validation failed', parsed.error.format());
      }
      const setlist = await setlistRepository.update(id, parsed.data);
      res.json(createSuccessResponse(setlist, 'Setlist updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid setlist ID');
      }
      const deleted = await setlistRepository.delete(id);
      if (!deleted) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addSong(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid setlist ID');
      }
      const parsed = addSongToSetlistSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.badRequest('Validation failed', parsed.error.format());
      }
      const setlist = await setlistRepository.findById(id);
      if (!setlist) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      const song = await songRepository.findById(parsed.data.songId);
      if (!song) {
        throw AppError.notFound(`Song #${parsed.data.songId} not found`);
      }
      await setlistRepository.addSong(id, parsed.data.songId, parsed.data.transposeOffset);
      const updated = await setlistRepository.findById(id);
      res.json(createSuccessResponse(updated, 'Song added to setlist'));
    } catch (error) {
      next(error);
    }
  }

  async removeSong(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const songId = parseInt(req.params.songId, 10);
      if (isNaN(id) || id <= 0 || isNaN(songId) || songId <= 0) {
        throw AppError.badRequest('Invalid setlist or song ID');
      }
      const setlist = await setlistRepository.findById(id);
      if (!setlist) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      await setlistRepository.removeSong(id, songId);
      const updated = await setlistRepository.findById(id);
      res.json(createSuccessResponse(updated, 'Song removed from setlist'));
    } catch (error) {
      next(error);
    }
  }

  async reorderSongs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid setlist ID');
      }
      const setlist = await setlistRepository.findById(id);
      if (!setlist) {
        throw AppError.notFound(`Setlist #${id} not found`);
      }
      const parsed = reorderSetlistSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.badRequest('Validation failed', parsed.error.format());
      }
      await setlistRepository.reorderSongs(id, parsed.data.songIds);
      const updated = await setlistRepository.findById(id);
      res.json(createSuccessResponse(updated, 'Setlist reordered successfully'));
    } catch (error) {
      next(error);
    }
  }
}

export const setlistController = new SetlistController();
