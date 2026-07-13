import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import { Request } from 'express';

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

// No auth required — the login page needs this before anyone is signed in.
// Only exposes what's safe to show publicly: name, logo, and slider images.
export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    const school = await prisma.school.findFirst();
    res.json({
      name: school?.name || 'School Election System',
      logo: school?.logo || null,
      heroImages: school?.heroImages || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public settings' });
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
const MAX_HERO_IMAGES = 6;

export const addHeroImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return res.status(400).json({ error: 'No images uploaded' });

    let school = await prisma.school.findFirst();
    if (!school) school = await prisma.school.create({ data: { name: 'My School' } });

    const newUrls = files.map((f) => (f as any).path);
    const combined = [...school.heroImages, ...newUrls].slice(0, MAX_HERO_IMAGES);

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: { heroImages: combined },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SETTINGS_CHANGE',
      entity: 'School',
      entityId: school.id,
      details: { action: 'hero_images_added', count: newUrls.length },
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

export const removeHeroImage = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    const school = await prisma.school.findFirst();
    if (!school) return res.status(404).json({ error: 'School settings not found' });

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: { heroImages: school.heroImages.filter((u) => u !== url) },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SETTINGS_CHANGE',
      entity: 'School',
      entityId: school.id,
      details: { action: 'hero_image_removed' },
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove image' });
  }
};

