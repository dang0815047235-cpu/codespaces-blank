import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JSX component without types
import BionovaLegacy from "@/components/BionovaLegacy.jsx";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <BionovaLegacy />;
}
