
import CrudResourcePage from "../components/CrudResourcePage";

export default function CustomersPage() {
  return (
    <CrudResourcePage
      title="Клиенты"
      description="База клиентов магазина: контактные данные и поиск."
      endpoint="/customers/"
      fields={[
        {
          name: "name",
          label: "Имя или название клиента",
          required: true,
          placeholder: "Например,  Baraka",
        },
        {
          name: "phone",
          label: "Телефон",
          placeholder: "+998 90 123 45 67",
        },
        {
          name: "email",
          label: "Электронная почта",
          placeholder: "client@example.com",
        },
        {
          name: "address",
          label: "Адрес",
          placeholder: "Город, улица, дом",
        },
      ]}
      searchFields={["name", "phone", "email", "address"]}
    />
  );
}
