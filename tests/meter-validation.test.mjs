import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMeterDraft, meterUsage } from "../lib/meter-validation.ts";
const now = new Date(2026, 9, 3);
const draft = {
  period: "2026-10",
  readingDate: "2026-10-03",
  electricityPrevious: "100",
  electricityCurrent: "142.125",
  waterPrevious: "20",
  waterCurrent: "24.2",
  notes: "Monthly reading",
};
test("readings support decimals and calculate electricity and water usage", () => {
  const result = validateMeterDraft(draft, now);
  assert.equal(
    meterUsage(result.electricityPrevious, result.electricityCurrent),
    42.125,
  );
  assert.equal(meterUsage(result.waterPrevious, result.waterCurrent), 4.2);
});
test("zero consumption is valid", () => {
  const result = validateMeterDraft(
    { ...draft, electricityCurrent: "100", waterCurrent: "20" },
    now,
  );
  assert.equal(meterUsage(result.waterPrevious, result.waterCurrent), 0);
});
test("empty, negative, non-finite, and excessive precision values are rejected", () => {
  for (const value of ["", "-1", "NaN", "Infinity", "1.1234", "1000000001"])
    assert.throws(() =>
      validateMeterDraft({ ...draft, waterPrevious: value }, now),
    );
});
test("current readings cannot be lower than previous readings", () => {
  assert.throws(() =>
    validateMeterDraft({ ...draft, electricityCurrent: "99" }, now),
  );
  assert.throws(() =>
    validateMeterDraft({ ...draft, waterCurrent: "19" }, now),
  );
});
test("invalid months, invalid calendar dates, future dates, and long notes are rejected", () => {
  assert.throws(() => validateMeterDraft({ ...draft, period: "2026-13" }, now));
  assert.throws(() =>
    validateMeterDraft({ ...draft, readingDate: "2026-02-30" }, now),
  );
  assert.throws(() =>
    validateMeterDraft({ ...draft, readingDate: "2026-10-04" }, now),
  );
  assert.throws(() =>
    validateMeterDraft({ ...draft, notes: "a".repeat(501) }, now),
  );
});
