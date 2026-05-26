import { createFileRoute } from "@tanstack/react-router";
import BionovaLegacy from "@/components/BionovaLegacy.jsx";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <BionovaLegacy />;
}
