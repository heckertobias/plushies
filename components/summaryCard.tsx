import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  name: string;
  birthday: string; // formatted string, e.g. "15.01.2024"
  avatarUrl?: string;
  onClick?: () => void;
};

function avatarInitials(name: string): string {
  if (!name.length) return "";
  const parts = name.split(/\s+/).map((p) => p[0] ?? "");
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first + last).toUpperCase();
}

export default function SummaryCard({ name, birthday, avatarUrl, onClick }: Props) {
  return (
    <Card onClick={onClick} className="w-fit hover:bg-accent hover:cursor-pointer">
      <CardContent className="flex items-top h-24">
        <Avatar className="h-full aspect-square rounded-lg size-auto">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{avatarInitials(name) || "?"}</AvatarFallback>
        </Avatar>
        <div className="ms-3">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight whitespace-nowrap">{name}</h3>
          <p className="text-muted-foreground text-xl">{birthday}</p>
        </div>
      </CardContent>
    </Card>
  );
}
