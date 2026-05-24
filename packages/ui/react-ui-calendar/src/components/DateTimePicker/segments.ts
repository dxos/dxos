//
// Copyright 2026 DXOS.org
//

import { type HourCycle } from './types';

export type SegmentKind = 'yyyy' | 'MM' | 'dd' | 'HH' | 'hh' | 'mm' | 'a';

export type SegmentValues = Partial<Record<SegmentKind, string>>;

export type DateSegmentOrder = readonly ('yyyy' | 'MM' | 'dd')[];
export type TimeSegmentOrder = readonly ('HH' | 'hh' | 'mm' | 'a')[];

const DEFAULT_LOCALE = (): string => (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

/**
 * Use `Intl.DateTimeFormat.formatToParts` to determine the locale's preferred
 * date segment order. Falls back to ISO order on environments without `Intl`
 * (vanishingly rare; tests run on node which has it).
 */
export const resolveDateSegmentOrder = (locale: string = DEFAULT_LOCALE()): DateSegmentOrder => {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 4, 24));
    const order: ('yyyy' | 'MM' | 'dd')[] = [];
    for (const part of parts) {
      if (part.type === 'year') order.push('yyyy');
      else if (part.type === 'month') order.push('MM');
      else if (part.type === 'day') order.push('dd');
    }
    return order.length === 3 ? order : ['yyyy', 'MM', 'dd'];
  } catch {
    return ['yyyy', 'MM', 'dd'];
  }
};

export const resolveHourCycle = (locale: string = DEFAULT_LOCALE()): HourCycle => {
  try {
    const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    const cycle = resolved.hourCycle;
    if (cycle === 'h11' || cycle === 'h12') return 'h12';
    return 'h23';
  } catch {
    return 'h23';
  }
};

export const resolveTimeSegmentOrder = (cycle: HourCycle): TimeSegmentOrder =>
  cycle === 'h12' ? (['hh', 'mm', 'a'] as const) : (['HH', 'mm'] as const);

const pad = (value: number, width: number): string => String(value).padStart(width, '0');

/** Format a `Date` to a `SegmentValues` map using the provided segment orders. */
export const formatSegments = (
  date: Date,
  options: { dateOrder?: DateSegmentOrder; timeOrder?: TimeSegmentOrder } = {},
): SegmentValues => {
  const segments: SegmentValues = {};
  if (options.dateOrder) {
    segments.yyyy = pad(date.getFullYear(), 4);
    segments.MM = pad(date.getMonth() + 1, 2);
    segments.dd = pad(date.getDate(), 2);
  }
  if (options.timeOrder) {
    if (options.timeOrder.includes('HH')) {
      segments.HH = pad(date.getHours(), 2);
    }
    if (options.timeOrder.includes('hh')) {
      const h = date.getHours() % 12;
      segments.hh = String(h === 0 ? 12 : h);
      segments.a = date.getHours() >= 12 ? 'PM' : 'AM';
    }
    segments.mm = pad(date.getMinutes(), 2);
  }
  return segments;
};

/**
 * Parse a `SegmentValues` map into a `Date`. Returns `undefined` if any
 * required segment is empty or invalid.
 *
 * Detects 12h vs 24h based on the presence of `hh`/`a` (12h) or `HH` (24h).
 * If neither time segment is present, time defaults to 00:00.
 */
export const parseSegments = (segments: SegmentValues): Date | undefined => {
  const yyyy = Number(segments.yyyy);
  const MM = Number(segments.MM);
  const dd = Number(segments.dd);
  if (!Number.isFinite(yyyy) || !Number.isFinite(MM) || !Number.isFinite(dd)) {
    return undefined;
  }
  if (segments.yyyy === '' || segments.MM === '' || segments.dd === '') {
    return undefined;
  }

  let hours = 0;
  let minutes = 0;
  const hasH23 = segments.HH !== undefined && segments.HH !== '';
  const has12 = segments.hh !== undefined && segments.hh !== '';
  if (hasH23) {
    const h = Number(segments.HH);
    if (!Number.isFinite(h)) return undefined;
    hours = h;
  } else if (has12) {
    const h = Number(segments.hh);
    if (!Number.isFinite(h)) return undefined;
    const ampm = segments.a ?? 'AM';
    if (ampm === 'PM') {
      hours = h === 12 ? 12 : h + 12;
    } else {
      hours = h === 12 ? 0 : h;
    }
  }
  if (segments.mm !== undefined && segments.mm !== '') {
    const m = Number(segments.mm);
    if (!Number.isFinite(m)) return undefined;
    minutes = m;
  }

  return new Date(yyyy, MM - 1, dd, hours, minutes, 0, 0);
};

/** Clamp-wrap a numeric segment within [min, max] (inclusive). */
const wrap = (value: number, delta: number, min: number, max: number): number => {
  const span = max - min + 1;
  let next = value + delta;
  while (next < min) next += span;
  while (next > max) next -= span;
  return next;
};

/**
 * Increment or decrement a single segment by `delta` (typically ±1).
 * Numeric segments wrap; AM/PM toggles.
 */
export const incrementSegment = (kind: SegmentKind, value: string, delta: number): string => {
  if (kind === 'a') {
    return value === 'AM' ? 'PM' : 'AM';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return value;
  }
  switch (kind) {
    case 'yyyy':
      return String(n + delta);
    case 'MM':
      return String(wrap(n, delta, 1, 12)).padStart(2, '0');
    case 'dd':
      return String(wrap(n, delta, 1, 31)).padStart(2, '0');
    case 'HH':
      return String(wrap(n, delta, 0, 23)).padStart(2, '0');
    case 'hh':
      return String(wrap(n, delta, 1, 12));
    case 'mm':
      return String(wrap(n, delta, 0, 59)).padStart(2, '0');
  }
};
