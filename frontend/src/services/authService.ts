import api from './api';
import { User } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),

  studentLogin: (username: string, otp: string) =>
    api.post<LoginResponse>('/auth/student-login', { username, otp }).then((r) => r.data),

  logout: (refreshToken: string | null) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
