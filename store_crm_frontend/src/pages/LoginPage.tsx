
import { useState } from "react";
import {
  Alert,
  Button,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { useAuthStore } from "../store/authStore";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await login(email, password);
      onLogin();
    } catch {
      // Ошибка отображается из Zustand.
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#f4f6fa",
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        shadow="md"
        radius="lg"
        p="xl"
        w="100%"
        maw={420}
      >
        <Stack gap="md">
          <div>
            <Title order={2}>Store CRM</Title>
            <Text c="dimmed" size="sm" mt={6}>
              Войдите в систему управления магазином
            </Text>
          </div>

          {error && <Alert color="red">{error}</Alert>}

          <TextInput
            label="Email"
            placeholder="you@example.com"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Пароль"
            placeholder="Введите пароль"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />

          <Button type="submit" loading={loading} fullWidth>
            Войти
          </Button>
        </Stack>
      </Paper>
    </div>
  );
}
