import api from './api';
import { ResultData } from '../types';

export const resultService = {
  getResults: (electionId: string) =>
    api.get<ResultData>(`/results/${electionId}`).then((r) => r.data),

  toggleLiveResults: (electionId: string) =>
    api.patch<{ liveResults: boolean }>(`/results/${electionId}/live-results`).then((r) => r.data),
};
