import { Router } from 'express';
import { authenticate, isAdmin, isSuperAdmin } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();
router.use(authenticate);

// Both roles can view the list (needed to populate the "Assign Admin" picker
// on an election), but only a Super Admin can create/edit/remove accounts.
router.get('/', isAdmin, adminController.getAdmins);
router.get('/:id', isAdmin, adminController.getAdmin);
router.post('/', isSuperAdmin, adminController.createAdmin);
router.put('/:id', isSuperAdmin, adminController.updateAdmin);
router.patch('/:id/reset-password', isSuperAdmin, adminController.resetAdminPassword);
router.delete('/:id', isSuperAdmin, adminController.deleteAdmin);

export default router;
