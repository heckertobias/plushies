import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTags, photoUrl } from "./utils";

test("parseTags reads a JSON array", () => {
  assert.deepEqual(parseTags('["Kuscheltier","Geschenk"]'), ["Kuscheltier", "Geschenk"]);
});

test("parseTags returns an empty list for null, empty or broken input", () => {
  assert.deepEqual(parseTags(null), []);
  assert.deepEqual(parseTags(undefined), []);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags("not json"), []);
});

test("photoUrl serves the stored file through the uploads route", () => {
  assert.equal(photoUrl("/uploads/12-1789108001305.webp"), "/api/uploads/12-1789108001305.webp");
  assert.equal(photoUrl("12-1789108001305.webp"), "/api/uploads/12-1789108001305.webp");
});
