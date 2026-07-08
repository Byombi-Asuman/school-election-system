import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';

export const getCandidates = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, positionId, status } = req.query;

    const candidates = await prisma.candidate.findMany({
      where: {
        ...(electionId && { electionId: electionId as string }),
        ...(positionId && { positionId: positionId as string }),
        ...(status && { status: status as any }),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        position: { select: { title: true } },
        election: { select: { title: true, status: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

export const getCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        position: true,
        election: { select: { title: true, status: true, liveResults: true } },
        _count: { select: { votes: true } },
      },
    });

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
};

export const uploadCandidatePhoto = async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: (req.file as any).path });
};

export const registerCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, positionId, studentId, manifesto } = req.body;
    const photo = req.file ? (req.file as any).path : (req.body.photo || null);

    // Validate election is in DRAFT or OPEN status
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    if (election.status === 'CLOSED' || election.status === 'ARCHIVED') {
      return res.status(400).json({ error: 'Election is not accepting candidates' });
    }

    // Validate student exists and is eligible
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.isEligible) {
      return res.status(400).json({ error: 'Student is not eligible' });
    }

    // Enforce maximum number of contestants allowed for this position
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) return res.status(404).json({ error: 'Position not found' });

    const contestantCount = await prisma.candidate.count({
      where: { positionId, status: { in: ['PENDING', 'APPROVED'] } },
    });

    if (contestantCount >= position.maxContestants) {
      return res.status(400).json({
        error: `This position has reached its maximum of ${position.maxContestants} contestant(s). Remove or reject an existing candidate first, or increase the limit on the position.`,
      });
    }

    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        positionId,
        studentId,
        manifesto,
        photo,
        status: 'PENDING',
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        position: { select: { title: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Candidate',
      entityId: candidate.id,
      details: { studentId, positionId, electionId },
      req,
    });

    res.status(201).json(candidate);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This student is already registered for this position' });
    }
    res.status(500).json({ error: 'Failed to register candidate' });
  }
};

export const updateCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { manifesto } = req.body;
    const photo = req.file ? (req.file as any).path : (req.body.photo || undefined);

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        ...(manifesto !== undefined && { manifesto }),
        ...(photo && { photo }),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Candidate',
      entityId: id,
      req,
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update candidate' });
  }
};

export const approveCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user!.id,
        rejectionReason: null,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'APPROVE',
      entity: 'Candidate',
      entityId: id,
      req,
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve candidate' });
  }
};

export const rejectCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'REJECT',
      entity: 'Candidate',
      entityId: id,
      details: { reason },
      req,
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
};

export const withdrawCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Candidate',
      entityId: id,
      details: { action: 'withdrawn' },
      req,
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw candidate' });
  }
};

export const deleteCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.candidate.delete({ where: { id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'Candidate',
      entityId: id,
      req,
    });

    res.json({ message: 'Candidate removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
};
