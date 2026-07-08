import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';

export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const { id: electionId } = req.params;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { positions: { orderBy: { order: 'asc' } } },
    });

    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Check if results are available
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ELECTION_ADMIN';
    if (!isAdmin && !election.liveResults && election.status !== 'CLOSED' && election.status !== 'ARCHIVED') {
      return res.status(403).json({ error: 'Results are not yet available' });
    }

    const results = await Promise.all(
      election.positions.map(async (position) => {
        const candidates = await prisma.candidate.findMany({
          where: { positionId: position.id, status: 'APPROVED' },
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
            _count: { select: { votes: true } },
          },
        });

        const totalVotesForPosition = candidates.reduce(
          (sum, c) => sum + c._count.votes,
          0
        );

        const ranked = candidates
          .map(c => ({
            id: c.id,
            studentId: c.studentId,
            name: `${c.student.user.firstName} ${c.student.user.lastName}`,
            photo: c.photo,
            manifesto: c.manifesto,
            voteCount: c._count.votes,
            percentage: totalVotesForPosition > 0
              ? Math.round((c._count.votes / totalVotesForPosition) * 100)
              : 0,
          }))
          .sort((a, b) => b.voteCount - a.voteCount);

        // Declare winners (top N based on maxWinners)

        let winners: string[] = [];
        let tiedIds: string[] = [];
        let hasTie = false;

        if (ranked.length > 0) {
          const cutoffScore = ranked[Math.min(position.maxWinners, ranked.length) - 1].voteCount;
          const aboveCutoff = ranked.filter(c => c.voteCount > cutoffScore).map(c => c.id);
          const atCutoff = ranked.filter(c => c.voteCount === cutoffScore).map(c => c.id);
          const remainingSlots = position.maxWinners - aboveCutoff.length;

          if (atCutoff.length > remainingSlots && remainingSlots > 0) {
            // Ambiguous — more candidates tied at the cutoff score than slots left
            hasTie = true;
            tiedIds = atCutoff;
            winners = aboveCutoff;
          } else {
            winners = [...aboveCutoff, ...atCutoff.slice(0, Math.max(remainingSlots, 0))];
          }
        }

        return {
          positionId: position.id,
          positionTitle: position.title,
          maxWinners: position.maxWinners,
          totalVotes: totalVotesForPosition,
          hasTie,
          candidates: ranked.map(c => ({
            ...c,
            isWinner: winners.includes(c.id),
            isTiedForWinner: tiedIds.includes(c.id),
          })),
        };
      })
    );


    // Overall stats
    const totalVoters = await prisma.student.count({ where: { isEligible: true } });
    const uniqueVoters = await prisma.vote.groupBy({
      by: ['voterId'],
      where: { electionId },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'EXPORT',
      entity: 'Results',
      entityId: electionId,
      req,
    });

    res.json({
      election: {
        id: election.id,
        title: election.title,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
        liveResults: election.liveResults,
      },
      results,
      summary: {
        totalEligibleVoters: totalVoters,
        totalVoted: uniqueVoters.length,
        turnoutPercent: totalVoters > 0
          ? Math.round((uniqueVoters.length / totalVoters) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

export const toggleLiveResults = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const election = await prisma.election.findUnique({ where: { id } });
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const updated = await prisma.election.update({
      where: { id },
      data: { liveResults: !election.liveResults },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SETTINGS_CHANGE',
      entity: 'Election',
      entityId: id,
      details: { liveResults: updated.liveResults },
      req,
    });

    res.json({ liveResults: updated.liveResults });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle live results' });
  }
};
