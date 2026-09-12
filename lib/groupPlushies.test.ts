import { test } from "node:test";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import type { Plushie } from "./schema";
import {
  GROUP_ORDER,
  countTodaysBirthdays,
  groupPlushies,
  nextBirthday,
  nextBirthdayMessage,
} from "./groupPlushies";

function makePlushie(name: string, birthday: string): Plushie {
  return {
    id: 1,
    name,
    birthday,
    origin: null,
    notes: null,
    photoPath: null,
    originalPhotoPath: null,
    tags: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

// A Wednesday, so "this week" runs Mon 08.06. – Sun 14.06. and "next week" 15.06. – 21.06.
const TODAY = dayjs("2026-06-10");

test("nextBirthday keeps this year's date when it is still ahead", () => {
  assert.equal(nextBirthday("2020-06-20", TODAY).format("YYYY-MM-DD"), "2026-06-20");
});

test("nextBirthday rolls over to next year once the date has passed", () => {
  assert.equal(nextBirthday("2020-06-01", TODAY).format("YYYY-MM-DD"), "2027-06-01");
});

test("nextBirthday treats today's date as today, not next year", () => {
  assert.equal(nextBirthday("2015-06-10", TODAY).format("YYYY-MM-DD"), "2026-06-10");
});

test("nextBirthday maps 29 February to 1 March in non-leap years", () => {
  // 2027 is not a leap year; new Date(2027, 1, 29) rolls over to 1 March.
  assert.equal(nextBirthday("2020-02-29", TODAY).format("YYYY-MM-DD"), "2027-03-01");
});

test("countTodaysBirthdays counts only today's plushies", () => {
  const all = [
    makePlushie("Heute A", "2020-06-10"),
    makePlushie("Heute B", "2011-06-10"),
    makePlushie("Morgen", "2020-06-11"),
    makePlushie("Vorbei", "2020-06-09"),
  ];
  assert.equal(countTodaysBirthdays(all, TODAY), 2);
  assert.equal(countTodaysBirthdays([], TODAY), 0);
});

test("nextBirthdayMessage explains an empty calendar", () => {
  assert.match(nextBirthdayMessage([], TODAY), /Noch keine Plüschies/);
});

test("nextBirthdayMessage names tomorrow, the day after, and longer gaps", () => {
  assert.match(nextBirthdayMessage([makePlushie("A", "2020-06-11")], TODAY), /schon morgen/);
  assert.match(nextBirthdayMessage([makePlushie("A", "2020-06-12")], TODAY), /übermorgen/);
  assert.match(nextBirthdayMessage([makePlushie("A", "2020-06-20")], TODAY), /in 10 Tagen/);
});

test("groupPlushies sorts every plushie into exactly one group", () => {
  const all = [
    makePlushie("Heute", "2020-06-10"),
    makePlushie("Morgen", "2020-06-11"),
    makePlushie("Diese Woche", "2020-06-13"),
    makePlushie("Nächste Woche", "2020-06-17"),
    makePlushie("Diesen Monat", "2020-06-28"),
    makePlushie("Nächsten Monat", "2020-07-05"),
    makePlushie("Später", "2020-11-02"),
  ];
  const groups = groupPlushies(all, TODAY);

  for (const group of GROUP_ORDER) {
    assert.equal(groups[group].length, 1, `group ${group} should hold exactly one plushie`);
    assert.equal(groups[group][0]?.name, group);
  }
  assert.equal(GROUP_ORDER.reduce((n, g) => n + groups[g].length, 0), all.length);
});

test("groupPlushies orders each group by the upcoming birthday", () => {
  const all = [
    makePlushie("Spät", "2020-11-20"),
    makePlushie("Früh", "2020-09-01"),
    makePlushie("Mitte", "2020-10-10"),
  ];
  const groups = groupPlushies(all, TODAY);
  assert.deepEqual(
    groups["Später"].map((p) => p.name),
    ["Früh", "Mitte", "Spät"],
  );
});
