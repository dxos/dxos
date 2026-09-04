//
// Copyright 2026 DXOS.org
//

import { type Accessor, createSignal } from 'solid-js';

import { type PluginEntry, type StatusPayload } from './types';

//
// Creep tuning. The ring auto-creeps toward a moving ceiling so a long
// activation silence never reads as a frozen disc. See the original
// hand-written driver for the rationale behind each constant.
//

/** Creep timer cadence, in milliseconds. */
export const CREEP_TICK_MS = 100;
/** State-1 ease rate — a gentle "we're alive" hint before real progress lands. */
export const STATE_1_RATE = 0.05;
/** State-1 asymptote (percent) the creep eases toward before host progress. */
export const STATE_1_ASYMPTOTE = 40;
/** State-2 ease rate — bridges the gap between sparse host `progress()` calls. */
export const STATE_2_RATE = 0.05;
/** State-2 lead (percent) the ceiling sits ahead of the last host value. */
export const STATE_2_BUMP = 15;
/** Hard ceiling the auto-creep never crosses (host must drive the rest). */
export const ABSOLUTE_CEILING = 90;

/** A seeded plugin plus whether it has activated yet. */
export type PluginRow = PluginEntry & { active: boolean };

/** Loader lifecycle phase. */
export type Phase = 'creep' | 'host' | 'dismissing';

/** A single rendered status line; `id` keys the `<For>` and survives in-place range ticks. */
export type StatusLine = {
  id: number;
  text: string;
  event?: string;
  module?: string;
};

/**
 * Asymptotic ease — `next = raw + (ceiling - raw) * rate`, clamped so it never
 * overshoots (or regresses past) the ceiling. Pure; unit-tested.
 */
export const easeToward = (raw: number, ceiling: number, rate: number): number =>
  raw >= ceiling - 0.1 ? raw : raw + (ceiling - raw) * rate;

/**
 * Clamp a host-supplied fraction to a percent in [0, 100]. Invalid / negative /
 * non-finite values collapse to 0 rather than poisoning the CSS var. Pure;
 * unit-tested.
 */
export const clampPercent = (fraction?: number): number =>
  typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 ? 0 : Math.min(1, fraction) * 100;

/** Display text for a payload — appends the `(index/total)` suffix when a range is present. */
export const displayText = (payload: StatusPayload): string =>
  payload.range ? `${payload.humanized} (${payload.range.index}/${payload.range.total})` : payload.humanized;

/**
 * Reactive loader store — owns the progress percent, the status-line log, and
 * the lifecycle phase, plus the auto-creep timer. All DOM-free, so the creep
 * math and status reduction are testable as plain functions; `Loader.tsx` binds
 * the accessors to the DOM and `bridge.ts` wraps the mutators as the imperative
 * `window.__bootLoader` facade.
 */
export type LoaderStore = {
  /** Progress as a percent in [0, 100] (the CSS `--boot-loader-bar-progress` value). */
  progress: Accessor<number>;
  /** Appended status lines, newest last. */
  lines: Accessor<StatusLine[]>;
  /** Current lifecycle phase. */
  phase: Accessor<Phase>;
  /** The activation row, in the order the host seeded it. */
  plugins: Accessor<PluginRow[]>;
  /** The abort handler once startup has stalled, or `undefined` while it is within budget. */
  onAbort: Accessor<(() => void) | undefined>;
  /** Whole seconds since the loader appeared. Ticks only while stalled — see {@link LoaderStore.stalled}. */
  elapsedSeconds: Accessor<number>;
  /** Apply a status update (append, or replace-in-place for range ticks). */
  pushStatus: (payload: StatusPayload) => void;
  /** Enter host-driven progress with `fraction` ∈ [0, 1]; never regresses. */
  setProgress: (fraction?: number) => void;
  /**
   * Register the icon for every plugin that *could* activate. Registration alone draws nothing:
   * most enabled plugins activate lazily on first use, so a row seeded from that set would sit
   * half-dim for the whole boot. Rows appear from {@link LoaderStore.activatePlugin}.
   */
  setPlugins: (entries: PluginEntry[]) => void;
  /** Append this plugin's icon to the row (opening faint, then brightening). Unregistered ids are ignored. */
  activatePlugin: (id: string) => void;
  /** Offer the user an abort (see `BootLoaderApi.stalled`). Idempotent — the first handler wins. */
  stalled: (onAbort: () => void) => void;
  /** Snap to 100%, stop the creep, and enter the dismissing phase. */
  ready: () => void;
  /** Stop the creep timer (call on teardown). */
  dispose: () => void;
};

export const createLoaderStore = (initialStatus?: string): LoaderStore => {
  const [progress, setProgressPct] = createSignal(0);
  const [lines, setLines] = createSignal<StatusLine[]>(initialStatus ? [{ id: 0, text: initialStatus }] : []);
  const [phase, setPhase] = createSignal<Phase>('creep');
  const [plugins, setPluginRows] = createSignal<PluginRow[]>([]);
  // Icons for every plugin that could activate, keyed by slug. Plain map, not a signal: nothing
  // renders from it directly.
  const registry = new Map<string, PluginEntry>();
  // Held as a signal rather than a boolean + prop so the button has the handler directly, and so a
  // second `stalled()` (a re-fired deadline) cannot swap it mid-press.
  const [onAbort, setOnAbort] = createSignal<(() => void) | undefined>(undefined);
  // Wall-clock from the moment the loader appeared, which is the number the user is actually asking
  // about ("how long has this been going?"). Only ticked once stalled: a healthy boot has no use for
  // a second timer, and the count is meaningless until it is long enough to notice.
  const startedAt = Date.now();
  const [elapsedSeconds, setElapsedSeconds] = createSignal(0);
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  const stopElapsed = (): void => {
    if (elapsedTimer != null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  };

  let creepCeiling = STATE_1_ASYMPTOTE;
  let creepRate = STATE_1_RATE;
  let nextId = initialStatus ? 1 : 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const startCreep = (): void => {
    if (timer == null) {
      timer = setInterval(() => setProgressPct((raw) => easeToward(raw, creepCeiling, creepRate)), CREEP_TICK_MS);
    }
  };

  const stopCreep = (): void => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const pushStatus = (payload: StatusPayload): void => {
    const text = displayText(payload);
    setLines((current) => {
      const previous = current.at(-1);
      // Dedup back-to-back identical transitions (same text + structured fields).
      if (
        previous &&
        previous.text === text &&
        (previous.event ?? null) === (payload.event ?? null) &&
        (previous.module ?? null) === (payload.module ?? null)
      ) {
        return current;
      }
      // Range tick — replace the current line in place rather than appending,
      // so a counted phase produces one entry with an updating suffix.
      if (payload.range && previous) {
        return [...current.slice(0, -1), { ...previous, text }];
      }
      return [...current, { id: nextId++, text, event: payload.event, module: payload.module }];
    });
  };

  const setPlugins = (entries: PluginEntry[]): void => {
    registry.clear();
    for (const entry of entries) {
      if (entry.icon) {
        registry.set(entry.id, entry);
      }
    }
  };

  const activatePlugin = (id: string): void => {
    const entry = registry.get(id);
    if (!entry || plugins().some((row) => row.id === id)) {
      return;
    }
    // Appended inactive, then flipped on the next frame so the entrance transition actually runs —
    // a row that only ever rendered active would skip it.
    setPluginRows((current) => [...current, { ...entry, active: false }]);
    requestAnimationFrame(() =>
      setPluginRows((current) => current.map((row) => (row.id === id ? { ...row, active: true } : row))),
    );
  };

  const setProgress = (fraction?: number): void => {
    setPhase('host');
    const pct = clampPercent(fraction);
    // The ring never regresses: hold the current value if the host reports lower.
    setProgressPct((current) => Math.max(current, pct));
    // Switch the creep to its state-2 cadence and lead the host value by a bump.
    creepRate = STATE_2_RATE;
    creepCeiling = Math.min(Math.max(creepCeiling, pct + STATE_2_BUMP), ABSOLUTE_CEILING);
    startCreep();
  };

  const stalled = (handler: () => void): void => {
    if (onAbort()) {
      return;
    }
    // Updater form, and the handler is the RETURN value: Solid would otherwise call a bare
    // function argument as an updater rather than storing it.
    setOnAbort((current) => current ?? handler);
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    elapsedTimer ??= setInterval(tick, 1_000);
  };

  const ready = (): void => {
    stopCreep();
    setProgressPct(100);
    setPhase('dismissing');
    // Startup got there in the end; the escape hatch is no longer an offer worth making.
    setOnAbort(undefined);
    stopElapsed();
  };

  const dispose = (): void => {
    stopCreep();
    stopElapsed();
  };

  startCreep();

  return {
    progress,
    lines,
    phase,
    plugins,
    onAbort,
    elapsedSeconds,
    pushStatus,
    setProgress,
    setPlugins,
    activatePlugin,
    stalled,
    ready,
    dispose,
  };
};
