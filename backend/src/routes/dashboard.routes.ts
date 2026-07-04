import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);
router.get('/admin', isAdmin, dashboardController.getDashboardStats);
router.get('/student', dashboardController.getStudentDashboard);
export default router;
