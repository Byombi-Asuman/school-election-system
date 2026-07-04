import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import * as resultController from '../controllers/result.controller';

const router = Router();
router.use(authenticate);

router.get('/:id', resultController.getResults);
router.patch('/:id/live-results', isAdmin, resultController.toggleLiveResults);

export default router;
