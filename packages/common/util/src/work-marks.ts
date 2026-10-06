//
// Copyright 2026 DXOS.org
//

/**
 * Prefix on every mark this module writes to the User Timing timeline.
 *
 * The timeline is shared with React's profiler and other libraries; the prefix is how a reader
 * (the perf harness over CDP, or the DevTools Timings track) picks out ours.
 */
export const WORK_MARK_PREFIX = 'dxos:';

/** Bounded because User Timing entries are never evicted, and marks stay on in production. */
const CAPACITY = 4_096;

/** One named instant. */
export type WorkMark = {
  name: string;
  /**
   * Wall-clock epoch milliseconds (`timeOrigin + startTime`).
   *
   * Absolute rather than `startTime`, which is relative to each realm's own origin: a mark taken
   * in a worker is only comparable to one taken in the tab on this clock.
   */
  at: number;
  detail?: string;
};

const isMark = (entry: PerformanceEntry): entry is PerformanceMark => entry.entryType === 'mark';

const ownMarks = (): PerformanceMark[] =>
  performance
    .getEntriesByType('mark')
    .filter(isMark)
    .filter((mark) => mark.name.startsWith(WORK_MARK_PREFIX));

const clearOwnMarks = (marks: readonly PerformanceMark[]): void => {
  for (const name of new Set(marks.map((mark) => mark.name))) {
    performance.clearMarks(name);
  }
};

/** Marks written since the last trim; the timeline is only scanned when this overflows. */
let written = 0;

/** Keeps the newest `CAPACITY` marks; `clearMarks` drops by name, so the survivors are re-marked at their original times. */
const trim = (): void => {
  const marks = ownMarks();
  const keep = marks.slice(-CAPACITY);
  clearOwnMarks(marks);
  for (const mark of keep) {
    performance.mark(mark.name, { startTime: mark.startTime, detail: mark.detail });
  }
  written = keep.length;
};

/** Epoch milliseconds on the high-resolution clock, comparable across realms. */
export const absoluteNow = (): number => performance.timeOrigin + performance.now();

/**
 * Records a named instant on the User Timing timeline: `markWork('ai.request')`,
 * `markWork('chat.submit', chatId)`.
 *
 * Latency milestones for the perf harness, which joins every realm's marks on their absolute time;
 * they also show on the DevTools Performance panel's Timings track.
 */
export const markWork = (name: string, detail?: string): void => {
  // Wrapped in an object: workerd's `performance.mark` rejects a primitive `detail`.
  performance.mark(WORK_MARK_PREFIX + name, detail === undefined ? undefined : { detail: { text: detail } });
  if (++written > CAPACITY * 2) {
    trim();
  }
};

/** The text {@link markWork} stored in a mark's `detail`. */
const markText = (detail: unknown): string | undefined =>
  typeof detail === 'object' && detail !== null && 'text' in detail && typeof detail.text === 'string'
    ? detail.text
    : undefined;

/** This realm's marks at or after `since` (epoch ms), oldest first, without the prefix. */
export const getWorkMarks = (since = 0): WorkMark[] =>
  ownMarks()
    .map((mark): WorkMark => {
      const at = performance.timeOrigin + mark.startTime;
      const name = mark.name.slice(WORK_MARK_PREFIX.length);
      const text = markText(mark.detail);
      return text === undefined ? { name, at } : { name, at, detail: text };
    })
    .filter((mark) => mark.at >= since);

/** Drops every mark this module wrote. For tests; nothing in the app resets them. */
export const resetWorkMarks = (): void => {
  clearOwnMarks(ownMarks());
  written = 0;
};
