//
// Copyright 2026 DXOS.org
//

/**
 * Global the marks are published under, for a reader OUTSIDE the realm.
 *
 * The arrangement `WORK_COUNTERS_GLOBAL` uses: a latency that starts in the tab and ends in a
 * worker can only be measured by a harness that reads every realm over CDP and joins the marks.
 */
export const WORK_MARKS_GLOBAL = '__dxosWorkMarks';

/** Where the ring lives, so two bundled copies of this module in one realm share it. */
const STORE_GLOBAL = '__dxosWorkMarksStore';

/** Bounded so a long-lived tab cannot grow it; a perf stage reads far fewer than this. */
const CAPACITY = 4_096;

/** One named instant. */
export type WorkMark = {
  name: string;
  /**
   * Wall-clock epoch milliseconds (`timeOrigin + now()`).
   *
   * Absolute rather than `performance.now()`, which is relative to each realm's own origin: a mark
   * taken in a worker is only comparable to one taken in the tab on this clock.
   */
  at: number;
  detail?: string;
};

const isStore = (value: unknown): value is WorkMark[] => Array.isArray(value);

const resolveStore = (): WorkMark[] => {
  const existing: unknown = Reflect.get(globalThis, STORE_GLOBAL);
  if (isStore(existing)) {
    return existing;
  }
  const store: WorkMark[] = [];
  Object.assign(globalThis, { [STORE_GLOBAL]: store });
  return store;
};

const marks = resolveStore();

/** Epoch milliseconds on the high-resolution clock, comparable across realms. */
export const absoluteNow = (): number => performance.timeOrigin + performance.now();

/**
 * Records a named instant: `markWork('ai.request')`, `markWork('chat.submit', chatId)`.
 *
 * Latency milestones for the perf harness, which joins every realm's marks on their absolute time.
 * One array push, so it is cheap enough to leave on in production.
 */
export const markWork = (name: string, detail?: string): void => {
  marks.push(detail === undefined ? { name, at: absoluteNow() } : { name, at: absoluteNow(), detail });
  if (marks.length > CAPACITY * 2) {
    marks.splice(0, marks.length - CAPACITY);
  }
};

/** A copy of this realm's marks at or after `since` (epoch ms), oldest first. */
export const getWorkMarks = (since = 0): WorkMark[] => marks.slice(-CAPACITY).filter((mark) => mark.at >= since);

/** Drops every mark. For tests; nothing in the app resets them. */
export const resetWorkMarks = (): void => {
  marks.length = 0;
};

// At module scope, so a realm that marked nothing is distinguishable from one without the probe.
Object.assign(globalThis, { [WORK_MARKS_GLOBAL]: getWorkMarks });
