import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { uploadLogo } from '../middleware/upload.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();
router.use(authenticate);
router.get('/', settingsController.getSettings);
router.put('/', isAdmin, uploadLogo.single('logo'), settingsController.updateSettings);
export default router;
