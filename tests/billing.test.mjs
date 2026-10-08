import assert from "node:assert/strict";
import { test } from "node:test";
import {
  amountNumber,
  billingPeriod,
  cycleDetails,
  notificationAllowed,
  timestampMillis,
} from "../lib/billing.ts";
test("rent balances count only approved payments for the assigned room and period", () => {
  const cycle = cycleDetails(
    { roomRent: "3,500", roomId: "room-a", rentDueDay: 5 },
    [
      {
        status: "approved",
        billingPeriod: "2026-10",
        roomId: "room-a",
        amount: 1000,
      },
      {
        status: "pending",
        billingPeriod: "2026-10",
        roomId: "room-a",
        amount: 1000,
      },
      {
        status: "approved",
        billingPeriod: "2026-09",
        roomId: "room-a",
        amount: 1000,
      },
      {
        status: "approved",
        billingPeriod: "2026-10",
        roomId: "old-room",
        amount: 3500,
      },
      { status: "approved", roomId: "room-a", amount: 3500 },
    ],
    new Date(2026, 9, 3),
  );
  assert.equal(cycle.paid, 1000);
  assert.equal(cycle.balance, 2500);
  assert.equal(cycle.daysUntilDue, 2);
  assert.equal(cycle.period, "2026-10");
});
test("overpayment never creates a negative due amount", () => {
  assert.equal(
    cycleDetails(
      { roomRent: 100 },
      [{ status: "approved", billingPeriod: "2026-10", amount: 200 }],
      new Date(2026, 9, 3),
    ).balance,
    0,
  );
  assert.equal(amountNumber("invalid"), 0);
  assert.equal(amountNumber(-100), 0);
});
test("local date billing periods and due days are stable at month boundaries", () => {
  assert.equal(billingPeriod(new Date(2026, 0, 1)), "2026-01");
  const cycle = cycleDetails(
    { roomRent: 100, rentDueDay: 100 },
    [],
    new Date(2026, 1, 28),
  );
  assert.equal(cycle.due.getDate(), 28);
  assert.equal(cycle.daysUntilDue, 0);
  assert.equal(
    cycleDetails({ rentDueDay: "bad" }, [], new Date(2026, 0, 7)).daysUntilDue,
    -2,
  );
});
test("billing due date is one month after the accepted room appointment", () => {
  const acceptedAt = new Date(2026, 8, 15, 12, 0, 0);
  const cycle = cycleDetails(
    { roomRent: 100, leaseStartedAt: acceptedAt },
    [],
    new Date(2026, 8, 16),
  );
  assert.equal(cycle.due.getFullYear(), 2026);
  assert.equal(cycle.due.getMonth(), 9);
  assert.equal(cycle.due.getDate(), 15);
  assert.equal(cycle.daysUntilDue, 29);
});
test("notification switches control every relevant event category", () => {
  for (const type of [
    "payment_update",
    "maintenance_message",
    "tour_update",
    "application_update",
    "rent_reminder",
    "message",
  ])
    assert.equal(
      notificationAllowed({ notificationsEnabled: false }, type),
      false,
    );
  assert.equal(
    notificationAllowed({ maintenanceUpdates: false }, "maintenance_message"),
    false,
  );
  assert.equal(
    notificationAllowed({ applicationUpdates: false }, "application_update"),
    false,
  );
  assert.equal(
    notificationAllowed({ tourUpdates: false }, "tour_update"),
    false,
  );
  assert.equal(
    notificationAllowed({ paymentReminders: false }, "rent_reminder"),
    false,
  );
  assert.equal(
    notificationAllowed({ maintenanceUpdates: false }, "payment_update"),
    true,
  );
});
test("timestamps support Firestore, Date, and legacy ISO strings", () => {
  assert.equal(timestampMillis({ toMillis: () => 123 }), 123);
  assert.equal(timestampMillis(new Date(1000)), 1000);
  assert.equal(timestampMillis("1970-01-01T00:00:01Z"), 1000);
  assert.equal(timestampMillis(undefined), 0);
});
