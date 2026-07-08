import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import bcrypt from 'bcryptjs';

const generateTempPassword = () => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Admin@${digits}`;
};

// GET /api/admins — list all Election Admin accounts.
// Readable by both SUPER_ADMIN and ELECTION_ADMIN so the "Assign Admin"
// picker on an election can be populated by whoever is managing it.
export const getAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ELECTION_ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { managedElections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch election admins' });
  }
};

export const getAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        managedElections: { select: { id: true, title: true, status: true } },
      },
    });

    if (!admin || admin.role !== 'ELECTION_ADMIN') {
      return res.status(404).json({ error: 'Election admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch election admin' });
  }
};

// POST /api/admins — SUPER_ADMIN only. Creates a new Election Admin account
// with a system-generated temporary password shown once on screen.
export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name and last name are required' });
    }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 12);

    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'ELECTION_ADMIN',
      },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'User',
      entityId: admin.id,
      details: { role: 'ELECTION_ADMIN', email: admin.email },
      req,
    });

    res.status(201).json({ message: 'Election admin created', admin, tempPassword });
  } catch (error: any) {
  console.error('createAdmin error:', error);
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Email already exists' });
  }
  res.status(500).json({ error: 'Failed to create election admin' });
}
};

// PUT /api/admins/:id — SUPER_ADMIN only.
export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, isActive } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ELECTION_ADMIN') {
      return res.status(404).json({ error: 'Election admin not found' });
    }

    const admin = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      details: { firstName, lastName, isActive },
      req,
    });

    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update election admin' });
  }
};

// PATCH /api/admins/:id/reset-password — SUPER_ADMIN only.
export const resetAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ELECTION_ADMIN') {
      return res.status(404).json({ error: 'Election admin not found' });
    }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      details: { email: target.email },
      req,
    });

    res.json({ message: 'Password reset', tempPassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// DELETE /api/admins/:id — SUPER_ADMIN only. Any elections this admin managed
// simply become unassigned (Election.admin is an optional, onDelete: SetNull relation).
export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ELECTION_ADMIN') {
      return res.status(404).json({ error: 'Election admin not found' });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      details: { email: target.email },
      req,
    });

    res.json({ message: 'Election admin removed. Any elections they managed are now unassigned.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete election admin' });
  }
};
