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

const formatDate = d3.utcFormat('%b %-d, %Y');
const formatMonth = d3.utcFormat('%b %Y');

/**
 * A cell value as a time and how to label it: an integer below 10000 is a year, any other number a date serial;
 * strings may be a year, a year and month (`YYYY-MM`) or a date.
 */
export const toTime = (value: PlotValue): { time: number; date: string } | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) && Math.abs(value) < MAX_YEAR) {
      return { time: yearTime(value), date: String(value) };
    }
    const time = SERIAL_EPOCH + value * DAY;
    return { time, date: formatDate(new Date(time)) };
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (/^-?\d{1,4}$/.test(text)) {
      return toTime(Number(text));
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
 * Reads one event per row: the time, its category, its title and an optional description. Rows without a
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
    return [{ id: String(index), ...when, column, label, ...(description && { description }) }];
  });

  return { columns: [...columns], events: events.sort((a, b) => a.time - b.time) };
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
export const timelineFraction = (time: number, [start, end]: [number, number], scale: TimelineScale = 'linear') => {
  const fraction = (time - start) / (end - start || 1);
  if (scale === 'linear') {
    return fraction;
  }

  const distance = Math.min(1, Math.max(0, 1 - fraction));
  return 1 - Math.log1p((LOG_BASE - 1) * distance) / Math.log(LOG_BASE);
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
