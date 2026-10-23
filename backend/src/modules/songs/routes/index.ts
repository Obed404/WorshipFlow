import { Router } from 'express';
import { songController } from '../controllers/song.controller.js';
import { asyncWrapper } from '../../common/middleware/error.middleware.js';

const router = Router();

// List songs with filters, search, sorting, pagination
router.get('/', asyncWrapper(songController.getSongs.bind(songController)));

// Import songs (single WorshipFlow doc, raw song, or batch)
router.post('/import', asyncWrapper(songController.importSongs.bind(songController)));

// Export single song in WorshipFlow JSON document format
router.get('/:id/export', asyncWrapper(songController.exportSong.bind(songController)));

// Get single song by ID with its labels
router.get('/:id', asyncWrapper(songController.getSongById.bind(songController)));

// Create a new song with labels
router.post('/', asyncWrapper(songController.createSong.bind(songController)));

// Update an existing song and its labels
router.put('/:id', asyncWrapper(songController.updateSong.bind(songController)));

// Delete song by ID
router.delete('/:id', asyncWrapper(songController.deleteSong.bind(songController)));

export default router;
