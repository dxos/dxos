//
// Copyright 2026 DXOS.org
//

/**
 * What the horizontal axis measures.
 * - `time` — real duration, fitted to the width available: an idle gap is as wide as it was long.
 * - `unit` — one fixed step per event: a burst and a lull read alike, and the drawing grows to the
 *   right instead of compressing, so an event already placed never moves again. That is what makes a
 *   live chart watchable — on a fitted axis every arrival shifts the whole history left.
 */
export type GanttAxis = 'time' | 'unit';

/** A labelled gridline, positioned in the same pixels as `GanttScale.at`. */
export type GanttTick = { at: number; label: string };

/** The mapping every part of the drawing shares: an instant to a horizontal offset in pixels. */
export type GanttScale = {
  at: (time: number) => number;
  /** The drawing's width: the time axis takes what it is given, the unit axis states its own. */
  width: number;
  /** The labelled gridlines, as many as fit — the label's own width decides, so the scale owns this. */
  ticks: GanttTick[];
};

/** Room a tick label needs; elapsed labels are short, so this also caps how many fit. */
const TIME_LABEL_WIDTH = 56;
const MAX_TIME_TICKS = 10;

/** Round tick intervals in milliseconds, so elapsed labels read `0s, 10s, 20s` rather than `13.4s`. */
const TICK_STEPS = [
  100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000, 7_200_000, 21_600_000, 43_200_000, 86_400_000,
];

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Elapsed time since the start of the axis. The span picks the form for every tick alike, so a
 * run's labels read as one unit: `0.2s` below a second's step, `45s` below a minute, `1:05` below an
 * hour, `1:02:05` beyond.
 */
export const formatElapsed = (elapsed: number, { span, step }: { span: number; step: number }): string => {
  const seconds = Math.round(elapsed / 1_000);
  if (span >= 3_600_000) {
    return `${Math.floor(seconds / 3_600)}:${pad2(Math.floor(seconds / 60) % 60)}:${pad2(seconds % 60)}`;
  }
  if (span >= 60_000) {
    return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
  }
  if (step < 1_000) {
    return `${(elapsed / 1_000).toFixed(1)}s`;
  }
  return `${seconds}s`;
};

/** An event's ordinal is two or three glyphs, so its labels pack tighter than a clock's. */
const EVENT_LABEL_WIDTH = 40;

export type TimeScaleOptions = {
  range: { start: number; end: number };
  /** The width the range is fitted into. */
  width: number;
  /** Clearance at each end, so a bar's cap and the first tick's label stay inside the drawing. */
  pad: number;
};

/** Duration against width, labelled with the time elapsed since the start of the range. */
export const timeScale = ({ range, width, pad }: TimeScaleOptions): GanttScale => {
  const span = Math.max(range.end - range.start, 1);
  const inner = Math.max(width - 2 * pad, 1);
  const at = (time: number): number => pad + ((time - range.start) / span) * inner;
  const maxTicks = Math.max(2, Math.min(MAX_TIME_TICKS, Math.floor(inner / TIME_LABEL_WIDTH)));
  const step =
    TICK_STEPS.find((candidate) => span / candidate <= maxTicks - 1) ??
    Math.ceil(span / (maxTicks - 1) / TICK_STEPS[TICK_STEPS.length - 1]) * TICK_STEPS[TICK_STEPS.length - 1];
  const ticks: GanttTick[] = [];
  for (let elapsed = 0; elapsed <= span; elapsed += step) {
    ticks.push({ at: at(range.start + elapsed), label: formatElapsed(elapsed, { span, step }) });
  }
  return { at, width, ticks };
};

export type UnitScaleOptions = {
  /** Every event's instant; order and duplicates do not matter. */
  times: readonly number[];
  /** Pixels per event — the axis's one unit. */
  step: number;
  /** Clearance at each end, which also keeps the newest node off the edge. */
  pad: number;
};

/**
 * One step per event, in the order they happened. Ordinals are global rather than per lane: a
 * delegation drops from a parent's node to its child's first node, and only a shared ordering keeps
 * those two at the same offset.
 */
export const unitScale = ({ times, step, pad }: UnitScaleOptions): GanttScale => {
  const events = [...new Set(times)].sort((left, right) => left - right);
  const last = Math.max(events.length - 1, 0);

  /** Index of the last event at or before `time`, or -1 when `time` precedes every event. */
  const floorIndex = (time: number): number => {
    let low = 0;
    let high = events.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (events[mid] <= time) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found;
  };

  // An instant between two events sits proportionally between their units: a lane's start or end is
  // rarely an event of its own, and snapping it to the nearest would pull a bar's edge off its node.
  const unit = (time: number): number => {
    if (events.length === 0) {
      return 0;
    }
    const index = floorIndex(time);
    if (index < 0) {
      return 0;
    }
    if (index >= last) {
      return last;
    }
    const from = events[index];
    return index + (time - from) / (events[index + 1] - from);
  };

  const stride = Math.max(1, Math.ceil(last / Math.max(Math.floor((last * step) / EVENT_LABEL_WIDTH), 1)));
  const ticks: GanttTick[] = [];
  for (let index = 0; events.length > 0 && index <= last; index += stride) {
    ticks.push({ at: pad + index * step, label: `#${index + 1}` });
  }

  return { at: (time) => pad + unit(time) * step, width: 2 * pad + last * step, ticks };
};
