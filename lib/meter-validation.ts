export type MeterDraft = {
  period: string;
  readingDate: string;
  electricityPrevious: string;
  electricityCurrent: string;
  waterPrevious: string;
  waterCurrent: string;
  notes: string;
};
export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validateMeterDraft(draft: MeterDraft, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.period))
    throw new Error("Enter a billing month as YYYY-MM.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.readingDate))
    throw new Error("Enter the reading date as YYYY-MM-DD.");
  const [year, month, day] = draft.readingDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    localDateString(date) !== draft.readingDate ||
    draft.readingDate > localDateString(now)
  )
    throw new Error("Choose a valid reading date that is not in the future.");
  const number = (value: string, label: string) => {
    if (!/^\d+(\.\d{1,3})?$/.test(value.trim()))
      throw new Error(
        `${label} must be a non-negative number with up to 3 decimal places.`,
      );
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed > 1000000000)
      throw new Error(`${label} is too large.`);
    return parsed;
  };
  const electricityPrevious = number(
    draft.electricityPrevious,
    "Previous electricity reading",
  );
  const electricityCurrent = number(
    draft.electricityCurrent,
    "Current electricity reading",
  );
  const waterPrevious = number(draft.waterPrevious, "Previous water reading");
  const waterCurrent = number(draft.waterCurrent, "Current water reading");
  if (electricityCurrent < electricityPrevious || waterCurrent < waterPrevious)
    throw new Error(
      "Current readings cannot be lower than previous readings. Contact management if a meter was replaced or reset.",
    );
  if (draft.notes.trim().length > 500)
    throw new Error("Notes cannot exceed 500 characters.");
  return {
    period: draft.period,
    readingDate: draft.readingDate,
    electricityPrevious,
    electricityCurrent,
    waterPrevious,
    waterCurrent,
    notes: draft.notes.trim(),
  };
}
export function meterUsage(previous: number, current: number) {
  return Math.round((current - previous) * 1000) / 1000;
}
