import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalElections,
      openElections,
      totalStudents,
      eligibleVoters,
      totalCandidates,
      totalVotes,
      recentAuditLogs,
      announcements,
    ] = await Promise.all([
      prisma.election.count(),
      prisma.election.count({ where: { status: 'OPEN' } }),
      prisma.student.count(),
      prisma.student.count({ where: { isEligible: true } }),
      prisma.candidate.count({ where: { status: 'APPROVED' } }),
      prisma.vote.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
      }),
      prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { election: { select: { title: true } } },
      }),
    ]);

    // Get elections with vote counts
    const electionsWithStats = await prisma.election.findMany({
      include: {
        _count: { select: { votes: true, candidates: true, positions: true } },
        positions: {
          include: {
            _count: { select: { votes: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Voter turnout per election
    const turnoutData = await Promise.all(
      electionsWithStats.map(async (election) => {
        const uniqueVoters = await prisma.vote.groupBy({
          by: ['voterId'],
          where: { electionId: election.id },
        });
        return {
          id: election.id,
          title: election.title,
          status: election.status,
          totalVoters: eligibleVoters,
          votedCount: uniqueVoters.length,
          turnoutPercent: eligibleVoters > 0
            ? Math.round((uniqueVoters.length / eligibleVoters) * 100)
            : 0,
          candidateCount: election._count.candidates,
          positionCount: election._count.positions,
          voteCount: election._count.votes,
        };
      })
    );

    res.json({
      stats: {
        totalElections,
        openElections,
        totalStudents,
        eligibleVoters,
        totalCandidates,
        totalVotes,
        voterTurnout: eligibleVoters > 0 ? Math.round((totalVotes / eligibleVoters / Math.max(openElections, 1)) * 100) : 0,
      },
      elections: turnoutData,
      recentActivity: recentAuditLogs,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getStudentDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get open elections
    const openElections = await prisma.election.findMany({
      where: { status: 'OPEN' },
      include: {
        positions: {
          include: {
            candidates: {
              where: { status: 'APPROVED' },
              include: {
                student: { include: { user: { select: { firstName: true, lastName: true } } } },
              },
            },
            votes: { where: { voterId: student.id } },
          },
        },
      },
    });

    // Check which positions the student has voted in
    const myVotes = await prisma.vote.findMany({
      where: { voterId: student.id },
      include: {
        election: { select: { title: true } },
        position: { select: { title: true } },
        candidate: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });

    // My candidacies
    const myCandidacies = await prisma.candidate.findMany({
      where: { studentId: student.id },
      include: {
        election: { select: { title: true, status: true } },
        position: { select: { title: true } },
      },
    });

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      student,
      openElections: openElections.map(e => ({
        ...e,
        positions: e.positions.map(p => ({
          ...p,
          hasVoted: p.votes.length > 0,
        })),
      })),
      myVotes,
      myCandidacies,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student dashboard' });
  }
};
