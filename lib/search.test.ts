import { test } from "node:test";
import assert from "node:assert/strict";
import type { Plushie } from "./schema";
import {
  EMPTY_FILTER,
  activeFilterCount,
  filterPlushies,
  isFilterActive,
  searchPlushies,
  type FilterState,
} from "./search";

function makePlushie(name: string, birthday: string, tags?: string[]): Plushie {
  return {
    id: 1,
    name,
    birthday,
    origin: null,
    notes: null,
    photoPath: null,
    originalPhotoPath: null,
    tags: tags ? JSON.stringify(tags) : null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function filter(overrides: Partial<FilterState>): FilterState {
  return { ...EMPTY_FILTER, ...overrides };
}

const BÄR = makePlushie("Bär", "2020-05-10", ["Kuscheltier"]);
const BRAUNBÄR = makePlushie("Brauner Bär", "2015-11-20", ["Kuscheltier", "Geschenk"]);
const HASE = makePlushie("Hase", "2019-02-14");

test("searchPlushies returns everything for an empty query", () => {
  assert.deepEqual(searchPlushies("   ", [BÄR, HASE]), [BÄR, HASE]);
});

test("searchPlushies ranks exact matches above substring matches", () => {
  const result = searchPlushies("bär", [BRAUNBÄR, BÄR]);
  assert.deepEqual(
    result.map((p) => p.name),
    ["Bär", "Brauner Bär"],
  );
});

test("searchPlushies tolerates a typo", () => {
  assert.deepEqual(
    searchPlushies("Hse", [BÄR, HASE]).map((p) => p.name),
    ["Hase"],
  );
});

test("searchPlushies drops names that are too different", () => {
  assert.deepEqual(searchPlushies("Elefant", [BÄR, HASE]), []);
});

test("isFilterActive and activeFilterCount treat a year range as one filter", () => {
  assert.equal(isFilterActive(EMPTY_FILTER), false);
  assert.equal(activeFilterCount(EMPTY_FILTER), 0);

  const f = filter({ name: "Bär", yearFrom: "2015", yearTo: "2020" });
  assert.equal(isFilterActive(f), true);
  assert.equal(activeFilterCount(f), 2);
});

test("filterPlushies matches names case-insensitively", () => {
  assert.deepEqual(
    filterPlushies([BÄR, HASE], filter({ name: "hAsE" })).map((p) => p.name),
    ["Hase"],
  );
});

test("filterPlushies requires every selected tag", () => {
  const all = [BÄR, BRAUNBÄR, HASE];
  assert.deepEqual(
    filterPlushies(all, filter({ tags: ["Kuscheltier"] })).map((p) => p.name),
    ["Bär", "Brauner Bär"],
  );
  assert.deepEqual(
    filterPlushies(all, filter({ tags: ["Kuscheltier", "Geschenk"] })).map((p) => p.name),
    ["Brauner Bär"],
  );
});

test("filterPlushies applies the birth-year range", () => {
  const all = [BÄR, BRAUNBÄR, HASE];
  assert.deepEqual(
    filterPlushies(all, filter({ yearFrom: "2019" })).map((p) => p.name),
    ["Bär", "Hase"],
  );
  assert.deepEqual(
    filterPlushies(all, filter({ yearTo: "2016" })).map((p) => p.name),
    ["Brauner Bär"],
  );
});

test("filterPlushies handles a day/month range inside one year", () => {
  assert.deepEqual(
    filterPlushies([BÄR, BRAUNBÄR, HASE], filter({ dayMonthFrom: "01.05", dayMonthTo: "31.05" })).map(
      (p) => p.name,
    ),
    ["Bär"],
  );
});

test("filterPlushies handles a day/month range spanning the turn of the year", () => {
  // 15.11. – 28.02. must keep November and February, but drop May.
  assert.deepEqual(
    filterPlushies([BÄR, BRAUNBÄR, HASE], filter({ dayMonthFrom: "15.11", dayMonthTo: "28.02" })).map(
      (p) => p.name,
    ),
    ["Brauner Bär", "Hase"],
  );
});

test("filterPlushies ignores an unparsable day/month value", () => {
  const all = [BÄR, BRAUNBÄR, HASE];
  assert.deepEqual(filterPlushies(all, filter({ dayMonthFrom: "kaputt" })), all);
});
