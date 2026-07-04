import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import * as announcementController from '../controllers/announcement.controller';

const router = Router();
router.use(authenticate);
router.get('/', announcementController.getAnnouncements);
router.post('/', isAdmin, announcementController.createAnnouncement);
router.put('/:id', isAdmin, announcementController.updateAnnouncement);
router.delete('/:id', isAdmin, announcementController.deleteAnnouncement);
export default router;
