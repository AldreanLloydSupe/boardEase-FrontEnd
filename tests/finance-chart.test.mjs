import { test } from "node:test";
import assert from "node:assert/strict";
import { revenueBuckets, paymentTime } from "../lib/finance-chart.ts";
const anchor = new Date(2026, 9, 3);
const payment = (dateSent, amount = 100, status = "approved") => ({
  dateSent,
  amount,
  status,
});
test("daily chart includes every day and counts only approved positive payments", () => {
  const buckets = revenueBuckets(
    [
      payment("10/03/2026", 3500),
      payment("10/03/2026", "₱12,500"),
      payment("10/03/2026", 100, "pending"),
      payment("10/03/2026", 100, "rejected"),
      payment("10/03/2026", -100),
      payment("09/30/2026"),
    ],
    "daily",
    anchor,
  );
  assert.equal(buckets.length, 31);
  assert.equal(buckets[2].amount, 16000);
  assert.equal(buckets[2].count, 2);
  assert.equal(buckets[1].amount, 0);
});
test("weekly groups cover the entire selected month once, using Monday boundaries", () => {
  const payments = Array.from({ length: 31 }, (_, i) =>
    payment(`10/${String(i + 1).padStart(2, "0")}/2026`, 1),
  );
  const buckets = revenueBuckets(payments, "weekly", anchor);
  assert.equal(
    buckets.reduce((sum, b) => sum + b.amount, 0),
    31,
  );
  assert.equal(buckets[0].start, new Date(2026, 9, 1).getTime());
  assert.equal(buckets.at(-1).end, new Date(2026, 10, 1).getTime());
  for (let i = 1; i < buckets.length; i++) {
    assert.equal(buckets[i].start, buckets[i - 1].end);
    assert.equal(new Date(buckets[i].start).getDay(), 1);
  }
});
test("monthly view includes twelve months of the selected year", () => {
  const buckets = revenueBuckets(
    [
      payment("01/01/2026", 20),
      payment("12/31/2026", 30),
      payment("01/01/2027", 100),
    ],
    "monthly",
    anchor,
  );
  assert.equal(buckets.length, 12);
  assert.equal(buckets[0].amount, 20);
  assert.equal(buckets[11].amount, 30);
  assert.equal(
    buckets.reduce((sum, b) => sum + b.amount, 0),
    50,
  );
});
test("yearly view shows five years ending at the selected year", () => {
  const buckets = revenueBuckets(
    [
      payment("01/01/2022", 10),
      payment("12/31/2026", 20),
      payment("12/31/2021", 500),
      payment("01/01/2027", 500),
    ],
    "yearly",
    anchor,
  );
  assert.deepEqual(
    buckets.map((b) => b.label),
    ["2022", "2023", "2024", "2025", "2026"],
  );
  assert.equal(
    buckets.reduce((sum, b) => sum + b.amount, 0),
    30,
  );
});
test("daily chart handles February leap years and period boundaries", () => {
  const buckets = revenueBuckets(
    [payment("02/29/2024", 50), payment("03/01/2024", 100)],
    "daily",
    new Date(2024, 1, 1),
  );
  assert.equal(buckets.length, 29);
  assert.equal(buckets[28].amount, 50);
});
test("undated payments are excluded while Firestore and legacy dates are supported", () => {
  assert.equal(
    paymentTime({
      createdAt: { toMillis: () => new Date(2026, 9, 3).getTime() },
    }),
    new Date(2026, 9, 3).getTime(),
  );
  const buckets = revenueBuckets(
    [
      { status: "approved", amount: 100 },
      { status: "approved", amount: 50, createdAt: new Date(2026, 9, 3) },
    ],
    "daily",
    anchor,
  );
  assert.equal(buckets[2].amount, 50);
});
