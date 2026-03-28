import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import type { Plushie } from "@/lib/schema";

dayjs.extend(isoWeek);

export type Group =
  | "Heute"
  | "Morgen"
  | "Diese Woche"
  | "Nächste Woche"
  | "Diesen Monat"
  | "Nächsten Monat"
  | "Später";

export type GroupedPlushies = Record<Group, Plushie[]>;

export const GROUP_ORDER: Group[] = [
  "Heute",
  "Morgen",
  "Diese Woche",
  "Nächste Woche",
  "Diesen Monat",
  "Nächsten Monat",
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

  // ISO week: Monday=1 … Sunday=7
  const thisWeekStart = today.startOf("isoWeek");
  const thisWeekEnd = today.endOf("isoWeek");
  const nextWeekStart = thisWeekStart.add(1, "week");
  const nextWeekEnd = thisWeekEnd.add(1, "week");

  if (!next.isBefore(thisWeekStart) && !next.isAfter(thisWeekEnd)) return "Diese Woche";
  if (!next.isBefore(nextWeekStart) && !next.isAfter(nextWeekEnd)) return "Nächste Woche";

  if (next.month() === today.month() && next.year() === today.year()) return "Diesen Monat";

  const nextMonth = today.add(1, "month");
  if (next.month() === nextMonth.month() && next.year() === nextMonth.year()) return "Nächsten Monat";

  return "Später";
}

export function groupPlushies(allPlushies: Plushie[], today: Dayjs = dayjs()): GroupedPlushies {
  const groups: GroupedPlushies = {
    Heute: [],
    Morgen: [],
    "Diese Woche": [],
    "Nächste Woche": [],
    "Diesen Monat": [],
    "Nächsten Monat": [],
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
