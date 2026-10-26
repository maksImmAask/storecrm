
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center mih="70vh">
      <Stack align="center" gap="md">
        <Title order={1}>404</Title>

        <Title order={3}>Страница не найдена</Title>

        <Text c="dimmed" ta="center">
          Такой страницы нет. Возможно, адрес был введён неправильно.
        </Text>

        <Button
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate("/")}
        >
          Вернуться на главную
        </Button>
      </Stack>
    </Center>
  );
}
