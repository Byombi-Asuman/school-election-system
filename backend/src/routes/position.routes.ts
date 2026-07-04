import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as positionController from '../controllers/position.controller';

const router = Router();
router.use(authenticate);

router.get('/', positionController.getPositions);
router.post('/', isAdmin, [body('electionId').notEmpty(), body('title').notEmpty(), validate], positionController.createPosition);
router.put('/:id', isAdmin, positionController.updatePosition);
router.delete('/:id', isAdmin, positionController.deletePosition);

export default router;
