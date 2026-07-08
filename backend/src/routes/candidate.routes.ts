import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { uploadPhoto } from '../middleware/upload.middleware';
import * as candidateController from '../controllers/candidate.controller';

const router = Router();
router.use(authenticate);

router.get('/', candidateController.getCandidates);
router.get('/:id', candidateController.getCandidate);
router.post('/upload-photo', uploadPhoto.single('photo'), candidateController.uploadCandidatePhoto);
router.post('/', isAdmin, uploadPhoto.single('photo'), candidateController.registerCandidate);
router.put('/:id', isAdmin, uploadPhoto.single('photo'), candidateController.updateCandidate);
router.patch('/:id/approve', isAdmin, candidateController.approveCandidate);
router.patch('/:id/reject', isAdmin, candidateController.rejectCandidate);
router.patch('/:id/withdraw', candidateController.withdrawCandidate);
router.delete('/:id', isAdmin, candidateController.deleteCandidate);

export default router;
