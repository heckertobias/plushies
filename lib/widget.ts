import dayjs, { type Dayjs } from "dayjs";
import type { Plushie } from "@/lib/schema";
import { nextBirthday } from "@/lib/groupPlushies";

export type WidgetPlushie = {
  id: number;
  name: string;
  /** Next birthday, YYYY-MM-DD. */
  date: string;
  /** 0 = today, 1 = tomorrow, … */
  daysUntil: number;
  /** Age on that birthday; null when the stored year is not a real birth year. */
  age: number | null;
  hasPhoto: boolean;
};

export type WidgetData = {
  today: WidgetPlushie[];
  upcoming: WidgetPlushie[];
};

/** Upcoming entries the widget gets; the small widget shows three, the rest is headroom. */
const UPCOMING_LIMIT = 5;

/** Data for the Scriptable home-screen widget: today's birthdays and the next ones after today. */
export function widgetData(allPlushies: Plushie[], today: Dayjs = dayjs()): WidgetData {
  today = today.startOf("day");

  const entries = allPlushies
    .map((p): WidgetPlushie => {
      const next = nextBirthday(p.birthday, today);
      const age = next.year() - Number(p.birthday.slice(0, 4));
      return {
        id: p.id,
        name: p.name,
        date: next.format("YYYY-MM-DD"),
        daysUntil: next.diff(today, "day"),
        age: age > 0 && age < 200 ? age : null,
        hasPhoto: !!p.photoPath,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, "de"));

  return {
    today: entries.filter((e) => e.daysUntil === 0),
    upcoming: entries.filter((e) => e.daysUntil > 0).slice(0, UPCOMING_LIMIT),
  };
}
