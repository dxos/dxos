//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';

/**
 * What the horizontal axis measures.
 * - `time` — real duration, fitted to the width available: an idle gap is as wide as it was long.
 * - `event` — one fixed step per event: a burst and a lull read alike, and the drawing grows to the
 *   right instead of compressing, so an event already placed never moves again. That is what makes a
 *   live chart watchable — on a fitted axis every arrival shifts the whole history left.
 */
export type GanttAxis = 'time' | 'event';

/** A labelled gridline, positioned in the same pixels as `GanttScale.at`. */
export type GanttTick = { at: number; label: string };

/** The mapping every part of the drawing shares: an instant to a horizontal offset in pixels. */
export type GanttScale = {
  at: (time: number) => number;
  /** The drawing's width: the time axis takes what it is given, the event axis states its own. */
  width: number;
  /** The labelled gridlines, as many as fit — the label's own width decides, so the scale owns this. */
  ticks: GanttTick[];
};

/** Upper bound on the time axis's ticks; `HH:mm:ss` needs the room, and more of them says nothing. */
const MAX_TIME_TICKS = 5;
const TIME_LABEL_WIDTH = 72;

/** An event's ordinal is two or three glyphs, so its labels pack tighter than a clock's. */
const EVENT_LABEL_WIDTH = 40;

export type TimeScaleOptions = {
  range: { start: number; end: number };
  /** The width the range is fitted into. */
  width: number;
  /** Clearance at each end, so a bar's cap and the first tick's label stay inside the drawing. */
  pad: number;
};

/** Duration against width: the axis the reader reads as a clock. */
export const timeScale = ({ range, width, pad }: TimeScaleOptions): GanttScale => {
  const span = Math.max(range.end - range.start, 1);
  const inner = Math.max(width - 2 * pad, 1);
  const at = (time: number): number => pad + ((time - range.start) / span) * inner;
  const count = Math.max(2, Math.min(MAX_TIME_TICKS, Math.floor(inner / TIME_LABEL_WIDTH)));
  return {
    at,
    width,
    ticks: Array.from({ length: count }, (_, index) => {
      const time = range.start + (span * index) / (count - 1);
      return { at: at(time), label: format(time, 'HH:mm:ss') };
    }),
  };
};

export type EventScaleOptions = {
  /** Every event's instant; order and duplicates do not matter. */
  times: readonly number[];
  /** Pixels per event — the axis's one unit. */
  step: number;
  pad: number;
  /** Trailing units of empty axis, so a live lane's newest event is not against the edge. */
  headroom?: number;
};

/**
 * One step per event, in the order they happened. Ordinals are global rather than per lane: a
 * delegation drops from a parent's node to its child's first node, and only a shared ordering keeps
 * those two at the same offset.
 */
export const eventScale = ({ times, step, pad, headroom = 1 }: EventScaleOptions): GanttScale => {
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

  return { at: (time) => pad + unit(time) * step, width: 2 * pad + (last + headroom) * step, ticks };
};
