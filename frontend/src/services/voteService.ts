import api from './api';

export const voteService = {
  cast: (electionId: string, votes: Array<{ positionId: string; candidateId: string }>) =>
    api.post('/votes', { electionId, votes }).then((r) => r.data as { message: string; count: number }),

  getStatus: (electionId: string) =>
    api.get(`/votes/status/${electionId}`).then((r) => r.data),
};
