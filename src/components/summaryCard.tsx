import type { Dayjs } from "dayjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

type DivProps = React.ComponentProps<"div">;

type SummaryCardProps = {
  name: string;
  birthday: Dayjs;
  avatarUrl?: string;
  onClick?: DivProps["onClick"];
};

function avatarInitials(name: string, maxChars: number = 2): string {
  if (!name.length) return "";

  const parts = name.split(/\s{1,}/g).map((part) => part[0]);
  let initials = parts[0];
  for (let i = 1; i < maxChars - 1; i++) initials += parts[i];
  return (initials += parts.length > 1 ? parts[parts.length - 1] : "").toUpperCase();
}

export default function SummaryCard({ name, birthday, avatarUrl, onClick }: SummaryCardProps) {
  const initials = avatarInitials(name);

  return (
    <Card onClick={onClick} className="w-fit hover:bg-accent hover:cursor-pointer">
      <CardContent className="flex items-top h-24">
        <Avatar className="h-full aspect-square rounded-lg size-auto">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="ms-3">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight whitespace-nowrap">
            {name}
          </h3>
          <p className="text-muted-foreground text-xl">{birthday.format("L")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
