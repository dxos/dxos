//
// Copyright 2026 DXOS.org
//

/**
 * A single measurement contributing to the activity calendar.
 * String dates must be ISO `YYYY-MM-DD` (interpreted in the local timezone).
 */
export type ActivityDatum = {
  date: Date | string;
  value: number;
};

export type ActivityCell = {
  date: Date;
  key: string;
  /** Column index (0 = oldest week). */
  week: number;
  /** Row index (0 = Monday). */
  day: number;
  value: number;
  /** Intensity bucket in [0, 4]. */
  level: number;
};

export type ActivityMonth = {
  /** Column index of the first week whose start falls in this month. */
  weekIndex: number;
  month: number;
  year: number;
};

export type ActivityCalendar = {
  cells: ActivityCell[];
  months: ActivityMonth[];
  weeks: number;
  max: number;
};

export type BuildCalendarOptions = {
  data: readonly ActivityDatum[];
  /** Number of week columns. */
  weeks?: number;
  /** Last day of the calendar; defaults to the most recent datum, falling back to today. */
  endDate?: Date | string;
};

const pad = (num: number): string => String(num).padStart(2, '0');

export const toKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Normalizes to a local date at midnight; ISO date strings are parsed by parts to avoid the
 * UTC shift of `new Date('YYYY-MM-DD')`.
 */
export const normalizeDate = (date: Date | string): Date => {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    return normalizeDate(new Date(date));
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/** Row index within a Monday-first week. */
const dayIndex = (date: Date): number => (date.getDay() + 6) % 7;

/**
 * Lays out data on a GitHub-style contribution calendar: columns are weeks (Monday-first),
 * rows are days, ending at `endDate` (the last column may be partial).
 */
export const buildCalendar = ({ data, weeks = 52, endDate }: BuildCalendarOptions): ActivityCalendar => {
  const values = new Map<string, number>();
  let latest: Date | undefined;
  for (const datum of data) {
    const date = normalizeDate(datum.date);
    const key = toKey(date);
    values.set(key, (values.get(key) ?? 0) + datum.value);
    if (!latest || date > latest) {
      latest = date;
    }
  }

  const end = endDate ? normalizeDate(endDate) : (latest ?? normalizeDate(new Date()));
  const start = addDays(end, -((weeks - 1) * 7 + dayIndex(end)));
  const total = (weeks - 1) * 7 + dayIndex(end) + 1;

  const cells: ActivityCell[] = [];
  let max = 0;
  for (let index = 0; index < total; index++) {
    const date = addDays(start, index);
    const key = toKey(date);
    const value = values.get(key) ?? 0;
    max = Math.max(max, value);
    cells.push({ date, key, week: Math.floor(index / 7), day: index % 7, value, level: 0 });
  }

  for (const cell of cells) {
    cell.level = max === 0 || cell.value <= 0 ? 0 : Math.min(4, Math.ceil((cell.value / max) * 4));
  }

  const months: ActivityMonth[] = [];
  for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
    const weekStart = addDays(start, weekIndex * 7);
    const previousStart = addDays(start, (weekIndex - 1) * 7);
    if (weekIndex === 0 || weekStart.getMonth() !== previousStart.getMonth()) {
      months.push({ weekIndex, month: weekStart.getMonth(), year: weekStart.getFullYear() });
    }
  }

  // Drop labels squeezed within a couple of columns of the next one so they cannot overlap.
  const spaced = months.filter(
    (entry, index) => index === months.length - 1 || months[index + 1].weekIndex - entry.weekIndex >= 3,
  );

  return { cells, months: spaced, weeks, max };
};
