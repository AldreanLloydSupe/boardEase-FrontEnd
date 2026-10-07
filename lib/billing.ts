export function amountNumber(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
export function peso(value: unknown) {
  return amountNumber(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}
export function billingPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function timestampMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  )
    return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return typeof value === "string" ? Date.parse(value) || 0 : 0;
}
export function cycleDetails(
  profile: Record<string, unknown>,
  payments: Record<string, unknown>[],
  now = new Date(),
) {
  const period = billingPeriod(now);
  const configuredDay = Number(profile.rentDueDay);
  const dueDay = Math.min(
    28,
    Math.max(
      1,
      Number.isFinite(configuredDay) && configuredDay
        ? Math.floor(configuredDay)
        : 5,
    ),
  );
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Only explicitly allocated payments settle a billing period; don't guess from submission date.
  const paid = payments
    .filter(
      (p) =>
        p.status === "approved" &&
        p.billingPeriod === period &&
        (!profile.roomId || p.roomId === profile.roomId),
    )
    .reduce((sum, p) => sum + amountNumber(p.amount), 0);
  const rent = amountNumber(profile.roomRent);
  return {
    period,
    due,
    rent,
    paid,
    balance: Math.max(0, rent - paid),
    daysUntilDue: Math.round((due.getTime() - today.getTime()) / 86400000),
  };
}
export function notificationAllowed(
  profile: Record<string, unknown>,
  type?: string,
) {
  if (profile.notificationsEnabled === false) return false;
  const key = type?.startsWith("maintenance")
    ? "maintenanceUpdates"
    : type?.startsWith("application")
      ? "applicationUpdates"
      : type?.startsWith("tour")
        ? "tourUpdates"
        : type?.startsWith("rent_")
          ? "paymentReminders"
          : "";
  return !key || profile[key] !== false;
}
