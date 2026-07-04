import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();
router.use(authenticate, isAdmin);
router.get('/', auditController.getAuditLogs);
export default router;
