export type Role = 'SUPER_ADMIN' | 'ELECTION_ADMIN' | 'STUDENT';
export type ElectionStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
export type CandidateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  student?: Student | null;
}

export interface Student {
  id: string;
  userId: string;
  admissionNumber: string;
  username: string;
  class: string;
  stream?: string | null;
  house?: string | null;
  year: number;
  isEligible: boolean;
  user?: { id: string; email: string; firstName: string; lastName: string; isActive: boolean; lastLoginAt?: string };
}

export interface Election {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: ElectionStatus;
  liveResults: boolean;
  createdById: string;
  adminId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string };
  admin?: { firstName: string; lastName: string } | null;
  positions?: Position[];
  _count?: { positions: number; candidates: number; votes: number };
}

export interface Position {
  id: string;
  electionId: string;
  title: string;
  description?: string | null;
  maxWinners: number;
  maxContestants: number;
  order: number;
  _count?: { candidates: number; votes: number };
  candidates?: Candidate[];
  votes?: Vote[];
  hasVoted?: boolean;
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  studentId: string;
  manifesto?: string | null;
  photo?: string | null;
  status: CandidateStatus;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  withdrawnAt?: string | null;
  createdAt: string;
  student?: Student;
  position?: { title: string };
  election?: { title: string; status: ElectionStatus };
  _count?: { votes: number };
}

export interface Vote {
  id: string;
  electionId: string;
  positionId: string;
  candidateId: string;
  voterId: string;
  castedAt: string;
  election?: { title: string };
  position?: { title: string };
  candidate?: Candidate;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; role: Role };
}

export interface Announcement {
  id: string;
  electionId?: string | null;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  election?: { title: string } | null;
}

export interface School {
  id: string;
  name: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  motto?: string | null;
  rules?: string | null;
}

export interface DashboardStats {
  stats: {
    totalElections: number;
    openElections: number;
    totalStudents: number;
    eligibleVoters: number;
    totalCandidates: number;
    totalVotes: number;
    voterTurnout: number;
  };
  elections: Array<{
    id: string;
    title: string;
    status: ElectionStatus;
    totalVoters: number;
    votedCount: number;
    turnoutPercent: number;
    candidateCount: number;
    positionCount: number;
    voteCount: number;
  }>;
  recentActivity: AuditLog[];
  announcements: Announcement[];
}

export interface ResultData {
  election: {
    id: string;
    title: string;
    status: ElectionStatus;
    startDate: string;
    endDate: string;
    liveResults: boolean;
  };
  results: Array<{
    positionId: string;
    positionTitle: string;
    maxWinners: number;
    totalVotes: number;
    candidates: Array<{
      id: string;
      studentId: string;
      name: string;
      photo?: string | null;
      manifesto?: string | null;
      voteCount: number;
      percentage: number;
      isWinner: boolean;
    }>;
  }>;
  summary: {
    totalEligibleVoters: number;
    totalVoted: number;
    turnoutPercent: number;
  };
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  [key: string]: any;
}

export interface OtpGenerateResponse {
  code: string;
  expiresAt: string;
  validForMinutes: number;
  emailSent: boolean;
  student: {
    name: string;
    email: string;
    username: string;
    admissionNumber: string;
  };
}

export interface ActiveOtp {
  id: string;
  studentName: string;
  studentEmail: string;
  username: string;
  expiresAt: string;
  createdAt: string;
}
