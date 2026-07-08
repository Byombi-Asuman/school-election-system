import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: { name: 'My School', id: 'school-001' },
      });
    }
    res.json(school);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, phone, email, website, motto, rules } = req.body;
    const logo = req.file ? (req.file as any).path : undefined;

    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({ data: { name: name || 'My School' } });
    }

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(motto !== undefined && { motto }),
        ...(rules !== undefined && { rules }),
        ...(logo && { logo }),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SETTINGS_CHANGE',
      entity: 'School',
      entityId: school.id,
      details: req.body,
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
