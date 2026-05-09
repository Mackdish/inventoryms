import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "./$id.edit";

export const Route = createFileRoute("/_app/products/new")({
  head: () => ({ meta: [{ title: "Add Product — InventoryMS" }] }),
  component: () => <ProductForm />,
});
