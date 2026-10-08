export type FinancePayment = {
  amount?: number | string;
  status?: string;
  dateSent?: string;
  approvedAt?: { toMillis: () => number } | Date | string | null;
  createdAt?: { toMillis: () => number } | Date | string | null;
};
export type ChartView = "daily" | "weekly" | "monthly" | "yearly";
export type RevenueBucket = {
  id: string;
  label: string;
  description: string;
  start: number;
  end: number;
  amount: number;
  count: number;
};
export function paymentAmount(amount: FinancePayment["amount"]) {
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : 0;
  if (typeof amount !== "string") return 0;
  const parsed = Number(amount.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function paymentTime(payment: FinancePayment) {
  const approvedAt = payment.approvedAt;
  if (approvedAt && typeof approvedAt === "object" && "toMillis" in approvedAt) {
    return approvedAt.toMillis();
  }
  if (approvedAt instanceof Date) return approvedAt.getTime();
  if (typeof approvedAt === "string") return Date.parse(approvedAt) || 0;

  if (payment.dateSent) {
    const match = payment.dateSent.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const sentAt = match
      ? new Date(
          Number(match[3]),
          Number(match[1]) - 1,
          Number(match[2]),
        ).getTime()
      : Date.parse(payment.dateSent);
    if (!Number.isNaN(sentAt) && sentAt > 0) return sentAt;
  }
  const createdAt = payment.createdAt;
  if (createdAt && typeof createdAt === "object" && "toMillis" in createdAt) {
    return createdAt.toMillis();
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === "string") return Date.parse(createdAt) || 0;
  return 0;
}

export function revenueBuckets(
  payments: FinancePayment[],
  view: ChartView,
  anchor: Date,
): RevenueBucket[] {
  const year = anchor.getFullYear(),
    month = anchor.getMonth();
  const buckets: RevenueBucket[] = [];
  const add = (start: Date, end: Date, label: string, description: string) => {
    buckets.push({
      id: String(start.getTime()),
      label,
      description,
      start: start.getTime(),
      end: end.getTime(),
      amount: 0,
      count: 0,
    });
  };
  if (view === "daily") {
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const start = new Date(year, month, day);
      add(
        start,
        new Date(year, month, day + 1),
        String(day),
        start.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      );
    }
  } else if (view === "weekly") {
    let start = new Date(year, month, 1),
      week = 1;
    const endOfMonth = new Date(year, month + 1, 1);
    while (start < endOfMonth) {
      const next = new Date(start);
      next.setDate(next.getDate() + ((8 - next.getDay()) % 7 || 7));
      const end = next < endOfMonth ? next : endOfMonth;
      const last = new Date(end);
      last.setDate(last.getDate() - 1);
      add(
        start,
        end,
        "W" + week++,
        start.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) +
          " – " +
          last.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
      );
      start = end;
    }
  } else if (view === "monthly") {
    for (let m = 0; m < 12; m++)
      add(
        new Date(year, m, 1),
        new Date(year, m + 1, 1),
        new Date(year, m, 1).toLocaleDateString("en-PH", { month: "short" }),
        new Date(year, m, 1).toLocaleDateString("en-PH", {
          month: "long",
          year: "numeric",
        }),
      );
  } else {
    for (let y = year - 4; y <= year; y++)
      add(new Date(y, 0, 1), new Date(y + 1, 0, 1), String(y), String(y));
  }
  for (const payment of payments) {
    if (payment.status !== "approved") continue;
    const time = paymentTime(payment),
      amount = paymentAmount(payment.amount);
    if (!time || !Number.isFinite(amount) || amount <= 0) continue;
    const bucket = buckets.find(
      (bucket) => time >= bucket.start && time < bucket.end,
    );
    if (bucket) {
      bucket.amount = Math.round((bucket.amount + amount) * 100) / 100;
      bucket.count++;
    }
  }
  return buckets;
}
