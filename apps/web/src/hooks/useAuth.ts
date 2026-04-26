import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { disconnectSocket } from '../lib/socket';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', input);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  return () => {
    clearAuth();
    disconnectSocket();
    navigate('/login');
  };
}

export function useMe() {
  return useAuthStore((s) => s.user);
}
