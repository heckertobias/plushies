import dayjs, { type Dayjs } from "dayjs";
import type { Plushie } from "@/lib/schema";

export type Group = "Heute" | "Morgen" | "Diese Woche" | "Dieser Monat" | "Später";

export type GroupedPlushies = Record<Group, Plushie[]>;

export const GROUP_ORDER: Group[] = [
  "Heute",
  "Morgen",
  "Diese Woche",
  "Dieser Monat",
  "Später",
];

export function nextBirthday(birthday: string, today: Dayjs): Dayjs {
  const [, month, day] = birthday.split("-").map(Number);
  const thisYear = today.year();
  const candidate = dayjs(new Date(thisYear, (month ?? 1) - 1, day ?? 1));
  if (candidate.isBefore(today, "day")) {
    return dayjs(new Date(thisYear + 1, (month ?? 1) - 1, day ?? 1));
  }
  return candidate;
}

function classify(birthday: string, today: Dayjs): Group {
  const next = nextBirthday(birthday, today);
  const diff = next.diff(today, "day");

  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  if (diff <= 6) return "Diese Woche";
  if (next.month() === today.month() && next.year() === today.year()) return "Dieser Monat";
  return "Später";
}

export function groupPlushies(allPlushies: Plushie[], today: Dayjs = dayjs()): GroupedPlushies {
  const groups: GroupedPlushies = {
    Heute: [],
    Morgen: [],
    "Diese Woche": [],
    "Dieser Monat": [],
    Später: [],
  };

  for (const p of allPlushies) {
    groups[classify(p.birthday, today)].push(p);
  }

  for (const group of GROUP_ORDER) {
    groups[group].sort((a, b) => {
      const da = nextBirthday(a.birthday, today);
      const db = nextBirthday(b.birthday, today);
      return da.diff(db, "day");
    });
  }

  return groups;
}
