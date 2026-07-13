import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { uploadLogo, uploadPhoto } from '../middleware/upload.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// Public, unauthenticated endpoint (the login page needs it before anyone is
// signed in) — so it needs its own lightweight IP-based limiter, since the
// per-user limiter inside `authenticate` never runs for a route registered
// before that middleware. Generous ceiling: this is a cheap, cacheable read,
// and many students loading the login page at once on shared WiFi is normal.
const publicSettingsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again shortly.' },
});

router.get('/public', publicSettingsLimiter, settingsController.getPublicSettings);

router.use(authenticate);
router.get('/', settingsController.getSettings);
router.put('/', isAdmin, uploadLogo.single('logo'), settingsController.updateSettings);
router.post('/hero-images', isAdmin, uploadPhoto.array('images', 6), settingsController.addHeroImages);
router.delete('/hero-images', isAdmin, settingsController.removeHeroImage);

export default router;
