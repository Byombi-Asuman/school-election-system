import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import { ElectionStatus } from '@prisma/client';

export const getElections = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = status ? { status: status as ElectionStatus } : {};

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          admin: { select: { firstName: true, lastName: true } },
          _count: { select: { positions: true, candidates: true, votes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.election.count({ where }),
    ]);

    res.json({ elections, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

export const getElection = async (req: AuthRequest, res: Response) => {
  try {
    const election = await prisma.election.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        admin: { select: { firstName: true, lastName: true } },
        positions: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { candidates: true, votes: true } },
          },
        },
        _count: { select: { candidates: true, votes: true } },
      },
    });

    if (!election) return res.status(404).json({ error: 'Election not found' });
    res.json(election);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch election' });
  }
};

export const createElection = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, startDate, endDate, adminId } = req.body;

    const election = await prisma.election.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: req.user!.id,
        adminId,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Election',
      entityId: election.id,
      details: { title },
      req,
    });

    res.status(201).json(election);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create election' });
  }
};

export const updateElection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, adminId, liveResults } = req.body;

    const election = await prisma.election.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(adminId !== undefined && { adminId }),
        ...(liveResults !== undefined && { liveResults }),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Election',
      entityId: id,
      details: req.body,
      req,
    });

    res.json(election);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update election' });
  }
};

export const updateElectionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validTransitions: Record<string, ElectionStatus[]> = {
      DRAFT: ['OPEN'],
      OPEN: ['PAUSED', 'CLOSED'],
      PAUSED: ['OPEN', 'CLOSED'],
      CLOSED: ['ARCHIVED'],
      ARCHIVED: [],
    };

    const current = await prisma.election.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Election not found' });

    if (!validTransitions[current.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${current.status} to ${status}`,
      });
    }

    const election = await prisma.election.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Election',
      entityId: id,
      details: { statusChange: `${current.status} -> ${status}` },
      req,
    });

    res.json(election);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update election status' });
  }
};

export const deleteElection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const election = await prisma.election.findUnique({ where: { id } });
    if (!election) return res.status(404).json({ error: 'Election not found' });

    if (election.status !== 'DRAFT' && election.status !== 'ARCHIVED') {
      return res.status(400).json({ error: 'Only DRAFT or ARCHIVED elections can be deleted' });
    }

    await prisma.election.delete({ where: { id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'Election',
      entityId: id,
      details: { title: election.title },
      req,
    });

    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete election' });
  }
};
