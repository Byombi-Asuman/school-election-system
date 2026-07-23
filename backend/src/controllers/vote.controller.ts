import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';

export const castVote = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, votes } = req.body;
    // votes: Array<{ positionId: string, candidateId: string }>
    // Note: voter identity and OTP verification already happened at login time
    // (see auth.controller.ts studentLogin) — the OTP is a one-time login credential,
    // not re-checked here.

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    if (!student.isEligible) return res.status(403).json({ error: 'You are not eligible to vote' });

    // Validate election
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    if (election.status !== 'OPEN') {
      return res.status(400).json({ error: 'Election is not currently open for voting' });
    }

    // Check election dates
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({ error: 'Election is outside voting period' });
    }

    // Validate each vote
    const errors: string[] = [];
    for (const vote of votes) {
      // Check if already voted for this position
      const existing = await prisma.vote.findUnique({
        where: {
          electionId_positionId_voterId: {
            electionId,
            positionId: vote.positionId,
            voterId: student.id,
          },
        },
      });

      if (existing) {
        const position = await prisma.position.findUnique({ where: { id: vote.positionId } });
        errors.push(`You have already voted for ${position?.title}`);
        continue;
      }

      // Validate candidate is approved and in this election/position
       if (vote.candidateId) {
        const candidate = await prisma.candidate.findFirst({
          where: {
            id: vote.candidateId,
            electionId,
            positionId: vote.positionId,
            status: 'APPROVED',
          },
        });

      if (!candidate) {
        errors.push(`Invalid candidate for position ${vote.positionId}`);
      }
    }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Vote validation failed', details: errors });
    }

    // Record all votes in a transaction
    const castVotes = await prisma.$transaction(
      votes.map((vote: { positionId: string; candidateId?: string | null }) =>
        prisma.vote.create({
          data: {
            electionId,
            positionId: vote.positionId,
            candidateId: vote.candidateId || null,
            voterId: student.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        })
      )
    );

    await createAuditLog({
      userId: req.user!.id,
      action: 'VOTE',
      entity: 'Election',
      entityId: electionId,
      details: {
        positionsVoted: votes.length,
        // Do NOT log which candidate was chosen - secret ballot
      },
      req,
    });

    res.status(201).json({
      message: 'Your votes have been recorded successfully',
      count: castVotes.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cast votes' });
  }
};

export const getVotingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId } = req.params;

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            votes: { where: { voterId: student.id } },
          },
        },
      },
    });

    if (!election) return res.status(404).json({ error: 'Election not found' });

    const votingStatus = election.positions.map(pos => ({
      positionId: pos.id,
      positionTitle: pos.title,
      hasVoted: pos.votes.length > 0,
    }));

    res.json({
      electionId,
      electionStatus: election.status,
      positions: votingStatus,
      allVoted: votingStatus.every(p => p.hasVoted),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get voting status' });
  }
};
