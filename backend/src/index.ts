import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './modules/common/utils/env.js';
import { errorMiddleware, notFoundMiddleware } from './modules/common/middleware/error.middleware.js';
import { db } from './modules/common/database/db_client.js';
import { AppError } from './modules/common/utils/app_error.js';
import { createSuccessResponse } from './modules/common/types/api.types.js';
import routes from './routes/index.js';

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.CORS_ORIGIN) return true;
  // Localhost on any port (IPv4 or hostname)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Private local area network IP ranges (RFC 1918)
  const isPrivateIp = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);
  return isPrivateIp;
}

class Application {
  private app: Express;
  private port: number;

  constructor() {
    this.app = express();
    this.port = env.PORT;

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new AppError('CORS origin not allowed', 403));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging (simple version)
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // Basic root route
    this.app.get('/', (_req: Request, res: Response) => {
      res.json(createSuccessResponse({
        service: 'WorshipFlow API',
        tagline: 'Every song. Every moment. One flow.',
        version: '1.0.0',
        status: 'operational',
        documentation: '/api/health',
      }, 'WorshipFlow API is running'));
    });

    // Handle 404 - route not found
    this.app.use(notFoundMiddleware);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      const isDatabaseHealthy = await db.healthCheck();
      if (!isDatabaseHealthy) {
        throw new AppError('Database connection failed', 500);
      }

      this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`
🚀 WorshipFlow Backend Server Started
----------------------------------------
🌐 Environment: ${env.NODE_ENV}
📡 Port: ${this.port}
🗄️  Database: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}
🔗 CORS Origin: ${env.CORS_ORIGIN}
📅 Started at: ${new Date().toISOString()}
        `);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('Received shutdown signal, closing connections...');
    
    try {
      await db.close();
      console.log('Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public getApp(): Express {
    return this.app;
  }
}

// Create and start the application
const app = new Application();

// Export for testing
export { app };

// Start the server if this file is run directly
if (import.meta.main || process.argv[1]?.includes('index')) {
  app.start().catch((error) => {
    console.error('Application failed to start:', error);
    process.exit(1);
  });
}