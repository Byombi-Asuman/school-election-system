import { Router } from 'express';
import { authenticate, isAdmin, isSuperAdmin } from '../middleware/auth.middleware';
import { uploadCSV } from '../middleware/upload.middleware';
import * as studentController from '../controllers/student.controller';

const router = Router();
router.use(authenticate, isAdmin);

router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudent);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.patch('/:id/eligibility', studentController.toggleEligibility);
router.post('/import', uploadCSV.single('file'), studentController.importStudents);
router.delete('/:id', isSuperAdmin, studentController.deleteStudent);

export default router;
