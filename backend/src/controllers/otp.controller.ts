import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import { sendOtpEmail } from '../utils/email';

const OTP_VALIDITY_MINUTES = 20;

const generateCode = (): string => {
  // 4-digit numeric code, cryptographically random
  const num = crypto.randomInt(0, 10000);
  return num.toString().padStart(4, '0');
};

export const generateOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Student username is required' });

    const student = await prisma.student.findUnique({
      where: { username: String(username).trim() },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'No student account found with that username' });
    }

    if (!student.user.isActive) {
      return res.status(400).json({ error: 'This student account is inactive' });
    }

    if (!student.isEligible) {
      return res.status(400).json({ error: 'This student is not eligible to vote' });
    }

    // Invalidate any previous unused OTPs for this student to avoid confusion
    await prisma.votingOtp.updateMany({
      where: { studentId: student.id, used: false, expiresAt: { gt: new Date() } },
      data: { used: true, usedAt: new Date() },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);

    const otp = await prisma.votingOtp.create({
      data: {
        studentId: student.id,
        code,
        expiresAt,
        generatedBy: req.user!.id,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'OTP_GENERATE',
      entity: 'VotingOtp',
      entityId: otp.id,
      details: { username: student.username }, // never log the code itself
      req,
    });

    let emailSent = false;

if (student.user.email) {
  emailSent = await sendOtpEmail(
    student.user.email,
    student.user.firstName,
    student.username,
    code,
    OTP_VALIDITY_MINUTES
  );
}
    res.status(201).json({
      code,
      expiresAt,
      validForMinutes: OTP_VALIDITY_MINUTES,
      emailSent,
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email ?? null,
        username: student.username,
        admissionNumber: student.admissionNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
};

export const verifyOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'OTP code is required' });

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const otp = await prisma.votingOtp.findFirst({
      where: {
        studentId: student.id,
        code: code.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one from your election administrator.' });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'OTP_VERIFY',
      entity: 'VotingOtp',
      entityId: otp.id,
      req,
    });

    res.json({
      valid: true,
      expiresAt: otp.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const getActiveOtps = async (req: AuthRequest, res: Response) => {
  try {
    const otps = await prisma.votingOtp.findMany({
      where: { used: false, expiresAt: { gt: new Date() } },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Never return the actual code in a list view for security - only on generation
    res.json(otps.map((o) => ({
      id: o.id,
      studentName: `${o.student.user.firstName} ${o.student.user.lastName}`,
      studentEmail: o.student.user.email,
      username: o.student.username,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active OTPs' });
  }
};
