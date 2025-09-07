import SummaryCard from "@/components/summaryCard";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div>
      <SummaryCard
        name={"Plushie Cute"}
        birthday={dayjs("2024-05-01")}
        avatarUrl={
          "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"
        }
      />
    </div>
  );
}
