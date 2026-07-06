import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { generateTokens, getRefreshExpiry, verifyAccessToken } from '../utils/jwt';
import { createAuditLog } from '../utils/audit';
import { sendPasswordResetEmail } from '../utils/email';
import { AuthRequest } from '../middleware/auth.middleware';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { student: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role === 'STUDENT') {
      return res.status(400).json({
        error: 'Students log in with their username and a one-time password from their election administrator, not email and password.',
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await createAuditLog({ action: 'LOGIN', details: { email, success: false }, req });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiry(),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      details: { email, success: true },
      req,
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        student: user.student,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const studentLogin = async (req: Request, res: Response) => {
  try {
    const { username, otp } = req.body;

    const student = await prisma.student.findUnique({
      where: { username: String(username).trim() },
      include: { user: true },
    });

    if (!student || !student.user.isActive) {
      await createAuditLog({ action: 'LOGIN', details: { username, success: false, reason: 'unknown_username' }, req });
      return res.status(401).json({ error: 'Invalid username or OTP' });
    }

    if (!student.isEligible) {
      return res.status(403).json({ error: 'This account is not currently eligible to vote and cannot log in.' });
    }

    const otpRecord = await prisma.votingOtp.findFirst({
      where: {
        studentId: student.id,
        code: String(otp).trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      await createAuditLog({ userId: student.userId, action: 'LOGIN', details: { username, success: false, reason: 'invalid_otp' }, req });
      return res.status(401).json({ error: 'Invalid or expired OTP. Please request a new one from your election administrator.' });
    }

    // Consume the OTP immediately — it is a one-time login credential
    await prisma.votingOtp.update({
      where: { id: otpRecord.id },
      data: { used: true, usedAt: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: student.user.id,
      email: student.user.email,
      role: student.user.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: student.user.id,
        expiresAt: getRefreshExpiry(),
      },
    });

    await prisma.user.update({
      where: { id: student.user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAuditLog({
      userId: student.user.id,
      action: 'LOGIN',
      details: { username, success: true, via: 'otp' },
      req,
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: student.user.id,
        email: student.user.email,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        role: student.user.role,
        student: { ...student, user: undefined },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    await createAuditLog({ userId: req.user?.id, action: 'LOGOUT', req });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (!stored.user.isActive) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.user.id,
        expiresAt: getRefreshExpiry(),
      },
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, lastLoginAt: true, createdAt: true,
        student: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent user enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailSent = await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    // In development (or if SMTP isn't configured yet), also return the link directly
    // so you can test the flow without needing email set up.
    if (process.env.NODE_ENV !== 'production' || !emailSent) {
      return res.json({
        message: emailSent
          ? 'Reset link sent to your email'
          : 'Email not configured — showing link directly for testing',
        resetUrl,
        resetToken,
        emailSent,
      });
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    await createAuditLog({ userId: user.id, action: 'PASSWORD_RESET', req });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await createAuditLog({ userId: user.id, action: 'PASSWORD_RESET', req });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};
