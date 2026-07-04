import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as voteController from '../controllers/vote.controller';

const router = Router();
router.use(authenticate);

router.post('/', [
  body('electionId').notEmpty(),
  body('votes').isArray({ min: 1 }),
  validate,
], voteController.castVote);

router.get('/status/:electionId', voteController.getVotingStatus);

export default router;
