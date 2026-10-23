import { Router } from 'express';
import labelRoutes from './routes/index.js';
import { labelRepository } from './repository/label.repository.js';
import { labelController } from './controllers/label.controller.js';

// Export types
export * from './types/label.types.js';

// Export repository
export { labelRepository };

// Export controller
export { labelController };

// Export routes
export { default as labelRouter } from './routes/index.js';

/**
 * Labels Module
 * 
 * This module handles song categorization labels with color coding and instrument associations.
 * Labels can be associated with multiple songs, and songs can have multiple labels.
 * 
 * Features:
 * - CRUD operations for labels
 * - Search and filtering by name and instrument
 * - Pagination and sorting
 * - Label statistics
 * - Song count tracking
 * - Color validation and default colors
 * 
 * Database Tables:
 * - labels: Main labels table
 * - song_labels: Many-to-many relationship with songs
 * 
 * Views:
 * - labels_with_counts: Labels with aggregated song counts
 */

export function mountLabelsModule(parentRouter: Router, basePath: string = '/labels'): void {
  parentRouter.use(basePath, labelRoutes);
  console.log(`📁 Labels module mounted at ${basePath}`);
}

export default {
  mount: mountLabelsModule,
  router: labelRoutes,
  repository: labelRepository,
  controller: labelController,
};