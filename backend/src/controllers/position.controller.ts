// position.controller.ts
import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';

export const getPositions = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId } = req.query;
    const positions = await prisma.position.findMany({
      where: { ...(electionId && { electionId: electionId as string }) },
      include: {
        _count: { select: { candidates: true, votes: true } },
      },
      orderBy: { order: 'asc' },
    });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};

export const createPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, title, description, maxWinners, maxContestants, order } = req.body;

    const position = await prisma.position.create({
      data: {
        electionId,
        title,
        description,
        maxWinners: parseInt(maxWinners) || 1,
        maxContestants: parseInt(maxContestants) || 10,
        order: parseInt(order) || 0,
      },
    });

    await createAuditLog({ userId: req.user!.id, action: 'CREATE', entity: 'Position', entityId: position.id, req });
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create position' });
  }
};

export const updatePosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, maxWinners, maxContestants, order } = req.body;

    const position = await prisma.position.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(maxWinners !== undefined && { maxWinners: parseInt(maxWinners) }),
        ...(maxContestants !== undefined && { maxContestants: parseInt(maxContestants) }),
        ...(order !== undefined && { order: parseInt(order) }),
      },
    });

    res.json(position);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update position' });
  }
};

export const deletePosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.position.delete({ where: { id } });
    await createAuditLog({ userId: req.user!.id, action: 'DELETE', entity: 'Position', entityId: id, req });
    res.json({ message: 'Position deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete position' });
  }
};
