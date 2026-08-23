//
// Copyright 2026 DXOS.org
//

import { type Step } from '../Stepper';

/** Where a run is: not started, in flight, finished, or failed. */
export type ProgressStatus = 'pending' | 'running' | 'done' | 'error';

/**
 * What a {@link ProgressMeter} renders.
 *
 * A presentational mirror of the runtime's task model, deliberately NOT that type: the meter knows
 * nothing about a registry, so it can be driven by a scripted value, a story fixture, or a live task
 * alike. The adapter that maps one to the other belongs with whoever owns the registry.
 *
 * The two axes are independent, because a real run separates them: `phases`/`phase` say where the run
 * is in its plan, `current`/`total` how far through the phase in flight. A run can be on phase 2 of 4
 * and know nothing about how long phase 2 is — which is exactly when `total` is absent and the
 * stage in flight spins rather than resting a line at a number that means nothing.
 */
export type ProgressState = {
  label?: string;
  status?: ProgressStatus;
  /** Items completed within the current phase. */
  current?: number;
  /** Items in the current phase; absent means the length is unknowable. */
  total?: number;
  /**
   * The plan: a count when the stages are anonymous, or the stages themselves when they have
   * identity. Fixed for the run — the stepper draws every stage it declares.
   */
  phases?: number | Step[];
  /** Zero-based index of the phase in flight. */
  phase?: number;
  /** What the current phase is doing, in the producer's words. */
  note?: string;
  error?: string;
  /** When the run started; the elapsed clock ticks from here. */
  startedAt?: string;
  elapsedMs?: number;
  /** Producer's estimate of the time remaining (ms). */
  etaMs?: number;
  /** Whether the producer can be interrupted — gates the cancel control. */
  cancellable?: boolean;
};
