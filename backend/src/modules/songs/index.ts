import { Router } from 'express';
import songRoutes from './routes/index.js';
import { songRepository } from './repository/song.repository.js';
import { songLabelRepository } from './repository/song_label.repository.js';
import { songController } from './controllers/song.controller.js';

// Export types
export * from './types/song.types.js';

// Export repositories
export { songRepository, songLabelRepository };

// Export controller
export { songController };

// Export routes
export { default as songRouter } from './routes/index.js';

/**
 * Songs Module
 *
 * Handles song management, inline chord storage, filtering by labels,
 * search, sorting, and atomic label associations.
 */
export function mountSongsModule(parentRouter: Router, basePath: string = '/songs'): void {
  parentRouter.use(basePath, songRoutes);
  console.log(`🎵 Songs module mounted at ${basePath}`);
}

export default {
  mount: mountSongsModule,
  router: songRoutes,
  repository: songRepository,
  labelRepository: songLabelRepository,
  controller: songController,
};
