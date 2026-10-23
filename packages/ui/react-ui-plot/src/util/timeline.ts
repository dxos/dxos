//
// Copyright 2026 DXOS.org
//

import * as d3 from 'd3';

import { type PlotData, type PlotValue, type TimelineEvent, type TimelineScale } from '../types.ts';

const DAY = 24 * 60 * 60 * 1000;

// Spreadsheet date serials count days from 1899-12-30.
const SERIAL_EPOCH = Date.UTC(1899, 11, 30);

// Below this an integer is read as a year rather than as a date serial.
const MAX_YEAR = 10_000;

const yearTime = (year: number) => {
  const date = new Date(Date.UTC(2000, 0, 1));
  date.setUTCFullYear(year);
  return date.getTime();
};

// Deep time is counted back from the start of 2000, close enough to "present" at the scale it is used.
const YEAR = 365.2425 * DAY;
const PRESENT = Date.UTC(2000, 0, 1);

/** Years in a deep-time unit: giga-, mega- or kilo-annum. */
const unitYears = (unit: string) => {
  switch (unit.toLowerCase()) {
    case 'g':
      return 1e9;
    case 'm':
      return 1e6;
    default:
      return 1e3;
  }
};

/** Spans at least this long (about ten thousand years) are deep time: counted in years ago, not on a calendar. */
export const MIN_DEEP_SPAN = 10_000 * YEAR;

/** The time `years` before the present; far beyond the range a `Date` can hold. */
export const timeOfYearsAgo = (years: number): number => PRESENT - years * YEAR;

/** How many years before the present a time is. */
export const yearsAgoOf = (time: number): number => (PRESENT - time) / YEAR;

const trimNumber = (value: number) => String(Number(value.toPrecision(3)));

/** Years before the present in the largest unit that keeps the number at least 1: `13.8 Gya`, `66 Mya`, `12 kya`. */
export const formatYearsAgo = (years: number): string => {
  for (const [unit, scale] of [
    ['G', 1e9],
    ['M', 1e6],
    ['k', 1e3],
  ] as const) {
    if (Math.abs(years) >= scale) {
      return `${trimNumber(years / scale)} ${unit}ya`;
    }
  }
  return `${trimNumber(years)} ya`;
};

const formatDate = d3.utcFormat('%b %-d, %Y');
const formatMonth = d3.utcFormat('%b %Y');

/**
 * A cell value as a time and how to label it: an integer below 10000 is a year, any other number a date serial;
 * strings may be a year, a year and month (`YYYY-MM`), a date, or deep time in years ago (`13.8 Gya`, `66 Mya`,
 * `300 kya`; `Ga`, `Ma` and `ka` too).
 */
export const toTime = (value: PlotValue): { time: number; date: string } | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) && Math.abs(value) < MAX_YEAR) {
      return { time: yearTime(value), date: value < 0 ? `${-value} BCE` : String(value) };
    }
    const time = SERIAL_EPOCH + value * DAY;
    return { time, date: formatDate(new Date(time)) };
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (/^-?\d{1,4}$/.test(text)) {
      return toTime(Number(text));
    }
    const deep = /^(\d+(?:\.\d+)?)\s*([gmk])(?:ya|a)$/i.exec(text);
    if (deep) {
      const years = Number(deep[1]) * unitYears(deep[2]);
      return { time: timeOfYearsAgo(years), date: formatYearsAgo(years) };
    }
    const month = /^(\d{4})-(\d{2})$/.exec(text);
    if (month) {
      const time = Date.UTC(Number(month[1]), Number(month[2]) - 1, 1);
      return { time, date: formatMonth(new Date(time)) };
    }
    const time = Date.parse(text);
    return Number.isNaN(time) ? undefined : { time, date: formatDate(new Date(time)) };
  }

  return undefined;
};

const toText = (value: PlotValue | undefined) => (value == null ? '' : String(value).trim());

/**
 * Reads one event per row: the time, its category, its title, and an optional description and image URL. Rows without a
 * readable time or a title are skipped. The categories, in order of first appearance, are the timeline's columns.
 */
export const toTimelineEvents = ({ rows }: PlotData): { columns: string[]; events: TimelineEvent[] } => {
  const columns = new Set<string>();
  const events = rows.flatMap((row, index): TimelineEvent[] => {
    const when = toTime(row[0]);
    const column = toText(row[1]);
    const label = toText(row[2]);
    if (!when || !label) {
      return [];
    }

    columns.add(column);
    const description = toText(row[3]);
    const image = toText(row[4]);
    return [
      {
        id: String(index),
        ...when,
        column,
        label,
        ...(description && { description }),
        ...(/^https?:\/\//.test(image) && { image }),
      },
    ];
  });

  return { columns: [...columns], events: events.sort((a, b) => a.time - b.time) };
};

/** Separates a category's parent from its child, as in `Tech/AI`. */
export const CATEGORY_SEPARATOR = '/';

/** A category's own name: the last segment of its path. */
export const categoryLabel = (category: string): string => category.slice(category.lastIndexOf(CATEGORY_SEPARATOR) + 1);

/**
 * Groups categories by the first segment of their path, in order of first appearance; a category without a parent
 * is a group of one named for itself.
 */
export const groupCategories = (categories: readonly string[]): { name: string; categories: string[] }[] => {
  const groups = new Map<string, string[]>();
  for (const category of categories) {
    const separator = category.indexOf(CATEGORY_SEPARATOR);
    const name = separator < 0 ? category : category.slice(0, separator);
    groups.set(name, [...(groups.get(name) ?? []), category]);
  }
  return [...groups].map(([name, categories]) => ({ name, categories }));
};

/** The categories with those named in `order` first, in that order, and the rest after in their own order. */
export const orderCategories = (categories: readonly string[], order: readonly string[] = []): string[] => {
  const rank = (category: string) => {
    const index = order.indexOf(category);
    return index < 0 ? order.length : index;
  };
  return categories
    .map((category, index) => ({ category, index }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.index - b.index)
    .map(({ category }) => category);
};

/** Whether an event's title, description, category or date contains the text, ignoring case; empty text matches all. */
export const matchesTimelineFilter = (event: TimelineEvent, filter: string | undefined): boolean => {
  const text = filter?.trim().toLowerCase();
  return (
    !text ||
    [event.label, event.description, event.column, event.date].some((field) => field?.toLowerCase().includes(text))
  );
};

// The log scale's curvature: the latest tenth of the range gets this many times the room of a linear scale.
const LOG_BASE = 10;

/**
 * Maps a time to its fraction [0, 1] of the way down the range. The log scale measures distance back
 * from the end, so the recent past spreads out and the distant past compresses.
 */
export const timelineFraction = (
  time: number,
  [start, end]: [number, number],
  scale: Exclude<TimelineScale, 'compact'> = 'linear',
) => {
  const fraction = (time - start) / (end - start || 1);
  if (scale === 'linear') {
    return fraction;
  }

  const distance = Math.min(1, Math.max(0, 1 - fraction));
  return 1 - Math.log1p((LOG_BASE - 1) * distance) / Math.log(LOG_BASE);
};

/**
 * Maps a time to its fraction [0, 1] with the event times (sorted, distinct) spaced equally; times between two events
 * fall between their positions in proportion, and times outside them clamp to the ends.
 */
export const evenFraction = (time: number, times: readonly number[]): number => {
  if (times.length < 2) {
    return times.length === 0 ? 0 : 0.5;
  }
  if (time <= times[0]) {
    return 0;
  }
  if (time >= times[times.length - 1]) {
    return 1;
  }

  const index = d3.bisectRight(times, time) - 1;
  const step = (time - times[index]) / (times[index + 1] - times[index]);
  return (index + step) / (times.length - 1);
};

/** The fraction function for a scale; the compact scale spaces the given event times equally. */
export const createTimelineFraction = (
  scale: TimelineScale,
  range: [number, number],
  times: readonly number[],
): ((time: number) => number) => {
  if (scale === 'compact') {
    const sorted = [...new Set(times)].sort((a, b) => a - b);
    return (time) => evenFraction(time, sorted);
  }

  return (time) => timelineFraction(time, range, scale);
};

/** The range to draw: the explicit start and end where given, otherwise the events' extent rounded outward. */
export const timelineRange = (
  events: readonly TimelineEvent[],
  { start, end }: { start?: string; end?: string } = {},
): [number, number] | undefined => {
  const explicitStart = start ? toTime(start)?.time : undefined;
  const explicitEnd = end ? toTime(end)?.time : undefined;
  const [min, max] = d3.extent(events, (event) => event.time);
  if (min === undefined || max === undefined) {
    return explicitStart !== undefined && explicitEnd !== undefined ? [explicitStart, explicitEnd] : undefined;
  }

  // A calendar cannot round deep time, so it keeps the events' own extent.
  if (max - min >= MIN_DEEP_SPAN) {
    return [explicitStart ?? min, explicitEnd ?? max];
  }

  const [niceStart, niceEnd] = d3
    .scaleUtc()
    .domain([min, max === min ? max + 365 * DAY : max])
    .nice()
    .domain()
    .map((date) => date.getTime());
  return [explicitStart ?? niceStart, explicitEnd ?? niceEnd];
};

/**
 * Moves label positions apart by at least `gap` while keeping their order: pushed down first, then back
 * up from `max`, never above `min`. Labels that cannot fit overflow below `max`.
 */
export const spreadLabels = (positions: readonly number[], gap: number, min: number, max: number): number[] => {
  const result = [...positions];
  for (let index = 0; index < result.length; index++) {
    result[index] = Math.max(result[index], index === 0 ? min : result[index - 1] + gap);
  }
  for (let index = result.length - 1; index >= 0; index--) {
    const limit = index === result.length - 1 ? max : result[index + 1] - gap;
    result[index] = Math.max(min + index * gap, Math.min(result[index], limit));
  }
  return result;
};

/**
 * The smallest height of at least `minHeight` at which no lane's spread labels drift more than `maxDrift`
 * from their events; `lanes` holds each lane's event positions as fractions [0, 1] of the range.
 */
export const fitTimelineHeight = (
  lanes: readonly (readonly number[])[],
  { minHeight, gap, maxDrift, padding }: { minHeight: number; gap: number; maxDrift: number; padding: number },
): number => {
  // Events at the same time stack a gap apart at any height, so that much drift is allowed on top.
  const allowances = lanes.map((fractions) => {
    const counts = new Map<number, number>();
    fractions.forEach((fraction) => counts.set(fraction, (counts.get(fraction) ?? 0) + 1));
    return fractions.map((fraction) => ((counts.get(fraction) ?? 1) - 1) * gap);
  });

  // How far past its allowance the worst label is pushed.
  const drift = (height: number) =>
    Math.max(
      0,
      ...lanes.map((fractions, lane) => {
        const positions = fractions.map((fraction) => padding + fraction * (height - padding * 2));
        const spread = spreadLabels(positions, gap, padding, height - padding);
        return Math.max(
          0,
          ...spread.map((position, index) => Math.abs(position - positions[index]) - allowances[lane][index]),
        );
      }),
    );

  if (drift(minHeight) <= maxDrift) {
    return minHeight;
  }

  // Drift falls as the height grows; once labels are a gap apart at their events it is zero.
  let low = minHeight;
  let high = minHeight * 2;
  while (drift(high) > maxDrift && high < minHeight * 64) {
    low = high;
    high *= 2;
  }
  for (let step = 0; step < 16; step++) {
    const middle = (low + high) / 2;
    if (drift(middle) > maxDrift) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Math.ceil(high);
};

/** Text width per pixel of font size, so a width at size `n` is `n` times it. */
export type MeasureText = (text: string) => number;

/**
 * The largest font size in `[min, max]` at which `prefix text` fits `width`; below `min`, the text (never the
 * prefix) is cut short with an ellipsis at `min`.
 */
export const fitLabel = (
  { prefix, text }: { prefix: string; text: string },
  width: number,
  measure: MeasureText,
  { min, max }: { min: number; max: number },
): { text: string; fontSize: number } => {
  const unit = measure(`${prefix} ${text}`);
  if (unit <= 0 || width / unit >= max) {
    return { text, fontSize: max };
  }
  if (width / unit >= min) {
    return { text, fontSize: width / unit };
  }

  let chars = text.length;
  while (chars > 0 && measure(`${prefix} ${text.slice(0, chars)}…`) * min > width) {
    chars--;
  }
  return { text: chars > 0 ? `${text.slice(0, chars).trimEnd()}…` : '', fontSize: min };
};
