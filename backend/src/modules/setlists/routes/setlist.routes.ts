import { Router } from 'express';
import { setlistController } from '../controllers/setlist.controller.js';

const router = Router();

router.get('/', setlistController.getAll.bind(setlistController));
router.post('/', setlistController.create.bind(setlistController));
router.get('/:id', setlistController.getById.bind(setlistController));
router.put('/:id', setlistController.update.bind(setlistController));
router.delete('/:id', setlistController.delete.bind(setlistController));

router.post('/:id/songs', setlistController.addSong.bind(setlistController));
router.delete('/:id/songs/:songId', setlistController.removeSong.bind(setlistController));
router.put('/:id/songs/reorder', setlistController.reorderSongs.bind(setlistController));

export default router;
