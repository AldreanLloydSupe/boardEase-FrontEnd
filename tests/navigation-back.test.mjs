import { test } from "node:test";
import assert from "node:assert/strict";
import { backOrReplace } from "../lib/navigation.ts";

test("back navigates to the prior screen when history exists", () => {
  const calls = [];
  backOrReplace(
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      replace: (href) => calls.push(href),
    },
    "/landlord/dashboard",
  );
  assert.deepEqual(calls, ["back"]);
});
test("back uses its fallback after refresh or direct page entry without history", () => {
  const calls = [];
  backOrReplace(
    {
      canGoBack: () => false,
      back: () => calls.push("back"),
      replace: (href) => calls.push(href),
    },
    "/landlord/dashboard",
  );
  assert.deepEqual(calls, ["/landlord/dashboard"]);
});
