
import CrudResourcePage from "../components/CrudResourcePage";

export default function SuppliersPage() {
  return (
    <CrudResourcePage
      title="Поставщики"
      description="Управление поставщиками и их контактными данными."
      endpoint="/suppliers/"
      fields={[
        {
          name: "name",
          label: "Название поставщика",
          required: true,
          placeholder: "Например, ООО Supplier",
        },
        {
          name: "phone",
          label: "Телефон",
          placeholder: "+998 90 123 45 67",
        },
        {
          name: "email",
          label: "Электронная почта",
          placeholder: "supplier@example.com",
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
