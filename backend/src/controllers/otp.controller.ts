import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import { sendOtpEmail } from '../utils/email';

const OTP_VALIDITY_MINUTES = 15;

// 6-digit numeric token, cryptographically random
const generateCode = (): string => {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, '0');
};

// Generate a code guaranteed to not collide with any other currently-active token,
// since login now looks up a token globally with no username to disambiguate.
const generateUniqueActiveCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const clash = await prisma.votingOtp.findFirst({
      where: { code, used: false, expiresAt: { gt: new Date() } },
    });
    if (!clash) return code;
  }
  throw new Error('Could not generate a unique token, please try again');
};

export const generateOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Student is required' });

    const student = await prisma.student.findUnique({
      where: { id: String(studentId) },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
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

    const code = await generateUniqueActiveCode();
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

    // Fire the email in the background — don't make the admin wait on the SMTP round trip
    sendOtpEmail(student.user.email, student.user.firstName, student.username, code, OTP_VALIDITY_MINUTES)
      .catch(() => {});

    res.status(201).json({
      code,
      expiresAt,
      validForMinutes: OTP_VALIDITY_MINUTES,
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        class: student.class,
        admissionNumber: student.admissionNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate token' });
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

    res.json(otps.map((o) => ({
      id: o.id,
      code: o.code,
      studentName: `${o.student.user.firstName} ${o.student.user.lastName}`,
      studentEmail: o.student.user.email,
      class: o.student.class,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active OTPs' });
  }
};
