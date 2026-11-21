import assert from "node:assert/strict";
import { test } from "node:test";

import { createRateLimiter, isSameOriginRequest } from "./requestGuard.ts";

test("allows requests up to the limit inside one window", () => {
  const isAllowed = createRateLimiter({ limit: 2, windowMs: 60000 });

  assert.equal(isAllowed(1000), true);
  assert.equal(isAllowed(2000), true);
});

test("refuses the request that goes over the limit inside one window", () => {
  const isAllowed = createRateLimiter({ limit: 2, windowMs: 60000 });
  isAllowed(1000);
  isAllowed(2000);

  assert.equal(isAllowed(3000), false);
});

test("allows requests again once the window has passed", () => {
  const isAllowed = createRateLimiter({ limit: 1, windowMs: 60000 });
  isAllowed(1000);

  assert.equal(isAllowed(61001), true);
});

test("accepts a request whose origin is the server itself", () => {
  const headers = new Headers({ origin: "http://localhost:3000", host: "localhost:3000" });

  assert.equal(isSameOriginRequest(headers), true);
});

test("refuses a request that comes from another site", () => {
  const headers = new Headers({ origin: "https://evil.example", host: "localhost:3000" });

  assert.equal(isSameOriginRequest(headers), false);
});

test("refuses a request without an origin", () => {
  assert.equal(isSameOriginRequest(new Headers({ host: "localhost:3000" })), false);
});

test("refuses a request whose origin is not a URL", () => {
  assert.equal(isSameOriginRequest(new Headers({ origin: "null", host: "localhost:3000" })), false);
});
