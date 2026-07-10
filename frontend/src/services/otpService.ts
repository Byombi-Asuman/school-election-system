import api from './api';
import { OtpGenerateResponse, ActiveOtp } from '../types';

export const otpService = {
  generate: (studentId: string) =>
    api.post<OtpGenerateResponse>('/otp/generate', { studentId }).then((r) => r.data),

  getActive: () => api.get<ActiveOtp[]>('/otp/active').then((r) => r.data),

  verify: (code: string) =>
    api.post<{ valid: boolean; expiresAt: string }>('/otp/verify', { code }).then((r) => r.data),
};
