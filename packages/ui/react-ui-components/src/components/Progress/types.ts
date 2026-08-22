//
// Copyright 2026 DXOS.org
//

/** Where a run is: not started, in flight, finished, or failed. */
export type ProgressStatus = 'pending' | 'running' | 'done' | 'error';

/** One step of a plan that has identity — a node the caller can address and select. */
export type ProgressStep = {
  id: string;
  label?: string;
};

/**
 * What both progress components render.
 *
 * A presentational mirror of the runtime's task model, deliberately NOT that type: these components
 * know nothing about a registry, so they can be used with a scripted value, a story fixture, or a
 * live task alike. The adapter that maps one to the other belongs with whoever owns the registry.
 *
 * The two axes are independent, because a real run separates them: `phases`/`phase` say where the run
 * is in its plan, `current`/`total` how far through the phase in flight. A run can be on phase 2 of 4
 * and know nothing about how long phase 2 is — which is exactly when `total` is absent and no bar is
 * drawn, since a bar with no fraction behind it conveys nothing.
 */
export type ProgressState = {
  label?: string;
  status?: ProgressStatus;
  /** Items completed within the current phase. */
  current?: number;
  /** Items in the current phase; absent means the length is unknowable. */
  total?: number;
  /**
   * The plan: a count when the steps are anonymous, or the steps themselves when they have identity.
   * The list form is what an unbounded run uses — it grows a step at a time and each is addressable.
   */
  phases?: number | ProgressStep[];
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

/** Shared by both components, so a caller can swap one for the other without rewriting its props. */
export type ProgressProps = {
  state: ProgressState;
  /**
   * Cancels a run in flight, and clears one that failed — where there is nothing left to cancel, but
   * the surface would otherwise hold its place with no way to dismiss it.
   */
  onCancel?: () => void;
  /** Index of a step the caller has singled out. */
  selected?: number;
  onSelect?: (step: { index: number; id: string }) => void;
};

/** Total number of steps in a plan, whichever form it takes. */
export const stepCount = (phases: ProgressState['phases']): number =>
  phases === undefined ? 0 : typeof phases === 'number' ? phases : phases.length;

/** The step at `index`, synthesizing an id for an anonymous plan. */
export const stepAt = (phases: ProgressState['phases'], index: number): ProgressStep =>
  typeof phases === 'number' || phases === undefined ? { id: `step-${index}` } : phases[index];
