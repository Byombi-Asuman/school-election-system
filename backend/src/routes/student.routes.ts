import { Router } from 'express';
import { authenticate, isAdmin} from '../middleware/auth.middleware';
import { uploadCSV } from '../middleware/upload.middleware';
import * as studentController from '../controllers/student.controller';

const router = Router();
router.use(authenticate, isAdmin);

router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudent);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.patch('/:id/eligibility', studentController.toggleEligibility);
router.patch('/:id/active', studentController.toggleActive);
router.post('/import', uploadCSV.single('file'), studentController.importStudents);
router.delete('/:id', studentController.deleteStudent);

export default router;
