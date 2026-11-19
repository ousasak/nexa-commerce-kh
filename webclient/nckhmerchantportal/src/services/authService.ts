import api from '../api/client';

export const authService = {
  login: (data: any) => api.post('/api/auth/login', data).then((r) => r.data),
  changePassword: (data: any) => api.post('/api/auth/change-password', data).then((r) => r.data),
  googleVerifyIdentity: (idToken: string, locale?: string) =>
    api.post('/api/auth/google/verify-identity', { id_token: idToken, locale }).then((r) => r.data),
  googleVerifyOtp: (verifyToken: string, code: string) =>
    api.post('/api/auth/google/verify-otp', { verify_token: verifyToken, code }).then((r) => r.data),
  googleResendOtp: (verifyToken: string, locale?: string) =>
    api.post('/api/auth/google/resend-otp', { verify_token: verifyToken, locale }).then((r) => r.data),
};

export default authService;
