import { Router } from 'express';
import { labelController } from '../controllers/label.controller.js';
import { asyncWrapper } from '../../common/middleware/error.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Labels
 *   description: Song categorization labels management
 */

/**
 * @swagger
 * /api/labels:
 *   get:
 *     summary: Get all labels with pagination and filtering
 *     tags: [Labels]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search labels by name
 *       - in: query
 *         name: instrument
 *         schema:
 *           type: string
 *           enum: [GUITAR, PIANO, UKULELE, BASS, MANDOLIN, OTHER]
 *         description: Filter by instrument type
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, created_at, song_count]
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Labels retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', asyncWrapper(labelController.getLabels.bind(labelController)));

/**
 * @swagger
 * /api/labels/search:
 *   get:
 *     summary: Search labels by name
 *     tags: [Labels]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search term (minimum 2 characters)
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid search term
 *       500:
 *         description: Internal server error
 */
router.get('/search', asyncWrapper(labelController.searchLabels.bind(labelController)));

/**
 * @swagger
 * /api/labels/statistics:
 *   get:
 *     summary: Get label statistics
 *     tags: [Labels]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', asyncWrapper(labelController.getLabelStatistics.bind(labelController)));

/**
 * @swagger
 * /api/labels/instrument/{instrument}:
 *   get:
 *     summary: Get labels by instrument type
 *     tags: [Labels]
 *     parameters:
 *       - in: path
 *         name: instrument
 *         schema:
 *           type: string
 *           enum: [GUITAR, PIANO, UKULELE, BASS, MANDOLIN, OTHER]
 *         required: true
 *         description: Instrument type
 *     responses:
 *       200:
 *         description: Labels retrieved successfully
 *       400:
 *         description: Invalid instrument type
 *       500:
 *         description: Internal server error
 */
router.get('/instrument/:instrument', asyncWrapper(labelController.getLabelsByInstrument.bind(labelController)));

/**
 * @swagger
 * /api/labels/{id}:
 *   get:
 *     summary: Get a label by ID
 *     tags: [Labels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Label ID
 *     responses:
 *       200:
 *         description: Label retrieved successfully
 *       400:
 *         description: Invalid label ID
 *       404:
 *         description: Label not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', asyncWrapper(labelController.getLabelById.bind(labelController)));

/**
 * @swagger
 * /api/labels:
 *   post:
 *     summary: Create a new label
 *     tags: [Labels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Label name
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 default: '#3b82f6'
 *                 description: Hex color code
 *               instrument:
 *                 type: string
 *                 enum: [GUITAR, PIANO, UKULELE, BASS, MANDOLIN, OTHER]
 *                 nullable: true
 *                 description: Associated instrument
 *     responses:
 *       201:
 *         description: Label created successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Label with same name already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', asyncWrapper(labelController.createLabel.bind(labelController)));

/**
 * @swagger
 * /api/labels/{id}:
 *   put:
 *     summary: Update a label
 *     tags: [Labels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Label ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Label name
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 description: Hex color code
 *               instrument:
 *                 type: string
 *                 enum: [GUITAR, PIANO, UKULELE, BASS, MANDOLIN, OTHER]
 *                 nullable: true
 *                 description: Associated instrument
 *     responses:
 *       200:
 *         description: Label updated successfully
 *       400:
 *         description: Invalid input data or no fields to update
 *       404:
 *         description: Label not found
 *       409:
 *         description: Label with same name already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', asyncWrapper(labelController.updateLabel.bind(labelController)));

/**
 * @swagger
 * /api/labels/{id}:
 *   delete:
 *     summary: Delete a label
 *     tags: [Labels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Label ID
 *     responses:
 *       204:
 *         description: Label deleted successfully
 *       400:
 *         description: Invalid label ID
 *       404:
 *         description: Label not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', asyncWrapper(labelController.deleteLabel.bind(labelController)));

export default router;