import { test } from "node:test";
import assert from "node:assert/strict";
import { COOKIE_NAME, createSessionToken, verifySessionToken } from "./auth";

// The token is an HMAC over a fixed payload, so it only depends on SESSION_SECRET.
function withSecret<T>(secret: string | undefined, fn: () => Promise<T>): Promise<T> {
  const previous = process.env.SESSION_SECRET;
  if (secret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = secret;
  return fn().finally(() => {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  });
}

test("createSessionToken is stable for the same secret", async () => {
  await withSecret("test-secret-value-1234567890", async () => {
    assert.equal(await createSessionToken(), await createSessionToken());
  });
});

test("verifySessionToken accepts a freshly created token", async () => {
  await withSecret("test-secret-value-1234567890", async () => {
    assert.equal(await verifySessionToken(await createSessionToken()), true);
  });
});

test("verifySessionToken rejects a tampered or empty token", async () => {
  await withSecret("test-secret-value-1234567890", async () => {
    const token = await createSessionToken();
    const tampered = (token[0] === "A" ? "B" : "A") + token.slice(1);
    assert.equal(await verifySessionToken(tampered), false);
    assert.equal(await verifySessionToken(""), false);
    assert.equal(await verifySessionToken(token.slice(0, -1)), false);
  });
});

test("a token signed with another secret is rejected", async () => {
  const foreign = await withSecret("a-totally-different-secret-value", () => createSessionToken());
  await withSecret("test-secret-value-1234567890", async () => {
    assert.equal(await verifySessionToken(foreign), false);
  });
});

test("without SESSION_SECRET no token is issued and none is accepted", async () => {
  await withSecret(undefined, async () => {
    await assert.rejects(createSessionToken(), /SESSION_SECRET is not set/);
    assert.equal(await verifySessionToken("anything"), false);
  });
});

test("the cookie name is the one the proxy reads", () => {
  assert.equal(COOKIE_NAME, "plushies_session");
});
