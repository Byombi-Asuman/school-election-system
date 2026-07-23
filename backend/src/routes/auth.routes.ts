import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { uploadPhoto } from '../middleware/upload.middleware';

const router = Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], authController.login);

router.post('/student-login', [
  body('token').notEmpty().trim(),
  validate,
], authController.studentLogin);

router.post('/logout', authenticate, authController.logout);
router.post('/refresh', [body('refreshToken').notEmpty(), validate], authController.refresh);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, uploadPhoto.single('profilePicture'), authController.updateProfile);

router.post('/forgot-password', [body('email').isEmail(), validate], authController.forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  validate,
], authController.resetPassword);

router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
], authController.changePassword);

export default router;
