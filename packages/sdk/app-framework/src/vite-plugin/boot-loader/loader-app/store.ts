//
// Copyright 2026 DXOS.org
//

import { type Accessor, createSignal } from 'solid-js';

import { type StatusPayload } from './types';

//
// Creep tuning. The ring auto-creeps toward a moving ceiling so a long
// activation silence never reads as a frozen disc. See the original
// hand-written driver for the rationale behind each constant.
//

/** Creep timer cadence, in milliseconds. */
export const CREEP_TICK_MS = 100;
/** State-1 ease rate — a gentle "we're alive" hint before real progress lands. */
export const STATE_1_RATE = 0.08;
/** State-1 asymptote (percent) the creep eases toward before host progress. */
export const STATE_1_ASYMPTOTE = 40;
/** State-2 ease rate — bridges the gap between sparse host `progress()` calls. */
export const STATE_2_RATE = 0.05;
/** State-2 lead (percent) the ceiling sits ahead of the last host value. */
export const STATE_2_BUMP = 15;
/** Hard ceiling the auto-creep never crosses (host must drive the rest). */
export const ABSOLUTE_CEILING = 90;

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
  /** Apply a status update (append, or replace-in-place for range ticks). */
  pushStatus: (payload: StatusPayload) => void;
  /** Enter host-driven progress with `fraction` ∈ [0, 1]; never regresses. */
  setProgress: (fraction?: number) => void;
  /** Snap to 100%, stop the creep, and enter the dismissing phase. */
  ready: () => void;
  /** Stop the creep timer (call on teardown). */
  dispose: () => void;
};

export const createLoaderStore = (initialStatus?: string): LoaderStore => {
  const [progress, setProgressPct] = createSignal(0);
  const [lines, setLines] = createSignal<StatusLine[]>(initialStatus ? [{ id: 0, text: initialStatus }] : []);
  const [phase, setPhase] = createSignal<Phase>('creep');

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

  const ready = (): void => {
    stopCreep();
    setProgressPct(100);
    setPhase('dismissing');
  };

  const dispose = (): void => stopCreep();

  startCreep();

  return { progress, lines, phase, pushStatus, setProgress, ready, dispose };
};
