
import { create } from "zustand";
import api from "../api/client";

interface LoginResponse {
  access: string;
  refresh: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const response = await api.post<LoginResponse>(
        "/auth/login/",
        { email, password }
      );

      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      set({
        accessToken: response.data.access,
        refreshToken: response.data.refresh,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      let message = "Не удалось войти. Проверьте данные и соединение.";

      if (axiosError(error)) {
        message =
          error.response?.data?.detail ??
          "Не удалось войти. Проверьте данные и соединение.";
      }

      set({ loading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    const refresh = localStorage.getItem("refresh_token");

    try {
      if (refresh) {
        await api.post("/auth/logout/", { refresh });
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      set({
        accessToken: null,
        refreshToken: null,
        error: null,
        loading: false,
      });
    }
  },
}));

function axiosError(
  error: unknown
): error is import("axios").AxiosError<{ detail?: string }> {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error
  );
}
