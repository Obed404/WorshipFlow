import { Request, Response } from 'express';
import { labelRepository } from '../repository/label.repository.js';
import {
  createLabelSchema,
  updateLabelSchema,
  labelQuerySchema,
  mapLabelRowToLabel,
  mapLabelWithCountRowToLabel,
} from '../types/label.types.js';
import { AppError } from '../../common/utils/app_error.js';
import { createSuccessResponse } from '../../common/types/api.types.js';
import { HTTP_STATUS } from '../../common/utils/status_codes.js';

export class LabelController {
  async getLabels(req: Request, res: Response) {
    try {
      // Validate query parameters
      const query = labelQuerySchema.parse(req.query);
      
      // Get labels with pagination
      const labels = await labelRepository.findAll(query);
      const total = await labelRepository.getTotalCount(query);
      
      // Map database rows to API response format
      const data = labels.map(mapLabelWithCountRowToLabel);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / query.limit);
      const hasNext = query.page < totalPages;
      const hasPrev = query.page > 1;
      
      res.json(createSuccessResponse(
        data,
        'Labels retrieved successfully',
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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in getLabels:', error);
      throw AppError.internalServerError('Failed to retrieve labels');
    }
  }

  async getLabelById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid label ID');
      }
      
      const label = await labelRepository.findById(id);
      
      if (!label) {
        throw AppError.notFound(`Label with id ${id} not found`);
      }
      
      const data = mapLabelRowToLabel(label);
      
      res.json(createSuccessResponse(data, 'Label retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in getLabelById for id ${req.params.id}:`, error);
      throw AppError.internalServerError('Failed to retrieve label');
    }
  }

  async createLabel(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = createLabelSchema.parse(req.body);
      
      // Create label
      const createdLabel = await labelRepository.create(validatedData);
      const data = mapLabelRowToLabel(createdLabel);
      
      res.status(HTTP_STATUS.CREATED).json(
        createSuccessResponse(data, 'Label created successfully')
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in createLabel:', error);
      
      if (error instanceof Error && error.name === 'ZodError') {
        throw AppError.validationError('Validation failed', error);
      }
      
      throw AppError.internalServerError('Failed to create label');
    }
  }

  async updateLabel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid label ID');
      }
      
      // Validate request body
      const validatedData = updateLabelSchema.parse(req.body);
      
      // Update label
      const updatedLabel = await labelRepository.update(id, validatedData);
      const data = mapLabelRowToLabel(updatedLabel);
      
      res.json(createSuccessResponse(data, 'Label updated successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in updateLabel for id ${req.params.id}:`, error);
      
      if (error instanceof Error && error.name === 'ZodError') {
        throw AppError.validationError('Validation failed', error);
      }
      
      throw AppError.internalServerError('Failed to update label');
    }
  }

  async deleteLabel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        throw AppError.badRequest('Invalid label ID');
      }
      
      // Delete label
      const deleted = await labelRepository.delete(id);
      
      if (!deleted) {
        throw AppError.internalServerError('Failed to delete label');
      }
      
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in deleteLabel for id ${req.params.id}:`, error);
      throw AppError.internalServerError('Failed to delete label');
    }
  }

  async getLabelsByInstrument(req: Request, res: Response) {
    try {
      const instrument = req.params.instrument.toUpperCase() as 
        'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER';
      
      // Validate instrument
      const validInstruments = ['GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER'];
      if (!validInstruments.includes(instrument)) {
        throw AppError.badRequest('Invalid instrument type');
      }
      
      const query = labelQuerySchema.parse({
        instrument,
        limit: 100, // Return all labels for this instrument
        page: 1,
        sort: 'name',
        order: 'ASC',
      });
      
      const labels = await labelRepository.findAll(query);
      const data = labels.map(mapLabelWithCountRowToLabel);
      
      res.json(createSuccessResponse(data, `${instrument} labels retrieved successfully`));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in getLabelsByInstrument for instrument ${req.params.instrument}:`, error);
      throw AppError.internalServerError('Failed to retrieve labels by instrument');
    }
  }

  async searchLabels(req: Request, res: Response) {
    try {
      const searchTerm = req.query.q as string;
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw AppError.badRequest('Search term is required');
      }
      
      if (searchTerm.trim().length < 2) {
        throw AppError.badRequest('Search term must be at least 2 characters');
      }
      
      const query = labelQuerySchema.parse({
        search: searchTerm.trim(),
        limit: 50, // Limit search results
        page: 1,
        sort: 'name',
        order: 'ASC',
      });
      
      const labels = await labelRepository.findAll(query);
      const data = labels.map(mapLabelWithCountRowToLabel);
      
      res.json(createSuccessResponse(data, 'Labels search completed successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in searchLabels:`, error);
      throw AppError.internalServerError('Failed to search labels');
    }
  }

  async getLabelStatistics(_req: Request, res: Response) {
    try {
      // Get counts by instrument
      const query = labelQuerySchema.parse({
        limit: 1000, // Get all labels for statistics
        page: 1,
        sort: 'name',
        order: 'ASC',
      });
      const instrumentCounts = await labelRepository.findAll(query);
      
      // Calculate statistics
      const statistics = {
        totalLabels: instrumentCounts.length,
        byInstrument: instrumentCounts.reduce((acc, label) => {
          const instrument = label.instrument || 'OTHER';
          acc[instrument] = (acc[instrument] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        labelsWithSongs: instrumentCounts.filter(label => label.song_count > 0).length,
        averageSongsPerLabel: instrumentCounts.length > 0 
          ? instrumentCounts.reduce((sum, label) => sum + label.song_count, 0) / instrumentCounts.length
          : 0,
        topLabels: instrumentCounts
          .sort((a, b) => b.song_count - a.song_count)
          .slice(0, 5)
          .map(label => ({
            id: label.id,
            name: label.name,
            songCount: label.song_count,
          })),
      };
      
      res.json(createSuccessResponse(statistics, 'Label statistics retrieved successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in getLabelStatistics:', error);
      throw AppError.internalServerError('Failed to retrieve label statistics');
    }
  }
}

export const labelController = new LabelController();