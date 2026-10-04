import { test } from "node:test";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import type { Plushie } from "./schema";
import { widgetData } from "./widget";

function makePlushie(id: number, name: string, birthday: string, photoPath: string | null = null): Plushie {
  return {
    id,
    name,
    birthday,
    origin: null,
    notes: null,
    photoPath,
    originalPhotoPath: null,
    tags: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const TODAY = dayjs("2026-06-10");

test("widgetData splits today's birthdays from the upcoming ones", () => {
  const data = widgetData(
    [
      makePlushie(1, "Später", "2020-08-01"),
      makePlushie(2, "Heute", "2023-06-10", "/uploads/2.webp"),
      makePlushie(3, "Morgen", "2024-06-11"),
      makePlushie(4, "Vorbei", "2024-06-09"),
    ],
    TODAY,
  );
  assert.deepEqual(data.today, [
    { id: 2, name: "Heute", date: "2026-06-10", daysUntil: 0, age: 3, hasPhoto: true },
  ]);
  assert.deepEqual(
    data.upcoming.map((e) => [e.name, e.daysUntil]),
    [["Morgen", 1], ["Später", 52], ["Vorbei", 364]],
  );
});

test("widgetData sorts same-day birthdays by name and caps the upcoming list", () => {
  const all = ["E", "D", "C", "B", "A", "F"].map((n, i) => makePlushie(i, n, "2020-07-01"));
  const data = widgetData(all, TODAY);
  assert.deepEqual(data.upcoming.map((e) => e.name), ["A", "B", "C", "D", "E"]);
});

test("widgetData leaves out an age that is not a real birth year", () => {
  const data = widgetData([makePlushie(1, "Neu", "2026-06-10")], TODAY);
  assert.equal(data.today[0]?.age, null);
});
