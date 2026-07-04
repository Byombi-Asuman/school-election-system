import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, isAdmin, isSuperAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as electionController from '../controllers/election.controller';

const router = Router();
router.use(authenticate);

router.get('/', electionController.getElections);
router.get('/:id', electionController.getElection);

router.post('/', isAdmin, [
  body('title').notEmpty().trim(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  validate,
], electionController.createElection);

router.put('/:id', isAdmin, electionController.updateElection);
router.patch('/:id/status', isAdmin, [body('status').notEmpty(), validate], electionController.updateElectionStatus);
router.delete('/:id', isSuperAdmin, electionController.deleteElection);

export default router;
