import { Router, Request, Response } from 'express';
import { asyncWrapper } from '../modules/common/middleware/error.middleware.js';
import { db } from '../modules/common/database/db_client.js';
import { createSuccessResponse } from '../modules/common/types/api.types.js';
import { AppError } from '../modules/common/utils/app_error.js';
import labelRoutes from '../modules/labels/routes/index.js';
import songRoutes from '../modules/songs/routes/index.js';
import setlistRoutes from '../modules/setlists/routes/setlist.routes.js';
import backupRoutes from '../modules/backup/routes/backup.routes.js';

const router = Router();

// Health endpoint
router.get('/health', asyncWrapper(async (_req: Request, res: Response) => {
  try {
    // Check database health
    const dbHealthy = await db.healthCheck();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        api: 'healthy',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
    };

    if (!dbHealthy) {
      throw new AppError('Database connection failed', 500);
    }

    res.json(createSuccessResponse(healthStatus, 'Service is healthy'));
  } catch (error) {
    // Return error response when database is unhealthy
    res.status(500).json({
      success: false,
      message: 'Service is unhealthy - database connection failed',
      error: {
        name: 'DatabaseConnectionError',
        details:
          process.env.NODE_ENV === 'production'
            ? 'Database connection unavailable'
            : error instanceof Error
              ? error.message
              : 'Unknown error',
      },
    });
  }
}));

// API info endpoint
router.get('/info', asyncWrapper(async (_req: Request, res: Response) => {
  const info = {
    name: 'WorshipFlow API',
    tagline: 'Every song. Every moment. One flow.',
    version: '1.0.0',
    description:
      'WorshipFlow — Digital worship songbook and live rehearsal platform with smart setlists, offline performance mode, and chord transposition.',
    database: {
      name: 'worshipflow',
      dialect: 'mysql',
    },
    endpoints: {
      health: '/api/health',
      songs: '/api/songs',
      songsExport: '/api/songs/:id/export',
      songsImport: '/api/songs/import',
      labels: '/api/labels',
      setlists: '/api/setlists',
      backup: '/api/backup',
    },
    environment: process.env.NODE_ENV,
    documentation: 'See README.md for API documentation',
  };

  res.json(createSuccessResponse(info, 'API information'));
}));

// Feature module endpoints
router.use('/labels', labelRoutes);
router.use('/songs', songRoutes);
router.use('/setlists', setlistRoutes);
router.use('/backup', backupRoutes);

// Module mounting functions
export function mountRoutes(parentRouter: Router, path: string, moduleRouter: Router): void {
  parentRouter.use(path, moduleRouter);
  console.log(`Mounted module: ${path}`);
}

export default router;
