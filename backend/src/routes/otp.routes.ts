import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as otpController from '../controllers/otp.controller';

const router = Router();
router.use(authenticate);

router.post('/generate', isAdmin, [body('studentId').notEmpty(), validate], otpController.generateOtp);
router.get('/active', isAdmin, otpController.getActiveOtps);
router.post('/verify', [body('code').notEmpty(), validate], otpController.verifyOtp);

export default router;
