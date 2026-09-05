//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

/** Where a stage sits relative to the run: behind it, in flight, ahead of it, or where it failed. */
export type StepState = 'pending' | 'active' | 'complete' | 'error';

export type StepperStyleProps = {
  state?: StepState;
  /** The run failed — the whole plan is drawn in the error hue, not only the stage it stopped on. */
  failed?: boolean;
  /** A stage the caller has singled out. */
  selected?: boolean;
  /** The stage can be clicked. */
  interactive?: boolean;
  /** The stage is running uncounted, so its circle is inset to leave room for the notch. */
  spinning?: boolean;
  /** The final stage, which has no trailing line. */
  last?: boolean;
};

/** Circles ahead of the run read as an outline; everything the run has reached is filled. */
const stepFill: Record<StepState, string> = {
  pending: 'bg-base-surface border-separator',
  active: 'bg-accent-bg border-transparent',
  complete: 'bg-accent-bg border-transparent',
  error: 'bg-error-surface border-transparent',
};

/**
 * The same drawing with the run's colour swapped for the error hue. What failed is the run, not only
 * the stage it stopped on, so a plan half-drawn in the accent would read as half of it having
 * gone fine. Only stages the run started change: one it never reached did not fail, and colouring it
 * would claim the failure reached further than it did.
 */
const failedStepFill: Record<StepState, string> = {
  ...stepFill,
  active: 'bg-error-surface border-transparent',
  complete: 'bg-error-surface border-transparent',
};

const root: ComponentFunction<StepperStyleProps> = (_props, ...etc) => mx('flex items-center w-full min-w-0', ...etc);

/**
 * A stage and the line leaving it. Stretches so the line can flex — except the last, which has no
 * line, and would otherwise claim a share of the width and pull the final circle off the end.
 */
const item: ComponentFunction<StepperStyleProps> = ({ last }, ...etc) =>
  mx('flex items-center min-w-0', !last && 'grow', ...etc);

const step: ComponentFunction<StepperStyleProps> = (
  { state = 'pending', failed, selected, interactive, spinning },
  ...etc
) =>
  mx(
    'absolute border rounded-full transition-all duration-200',
    // Drawn inset while it spins, so the notch reads as a ring around it rather than a collar.
    spinning ? 'inset-[3px]' : 'inset-0',
    interactive && 'cursor-pointer',
    // Selection is the reader's own marker, so it outranks the run's colours either way.
    selected ? 'bg-neutral-500 border-transparent' : (failed ? failedStepFill : stepFill)[state],
    ...etc,
  );

const notch: ComponentFunction<StepperStyleProps> = (_props, ...etc) =>
  mx('dx-fullscreen animate-spin text-accent-bg', ...etc);

/**
 * The line between two stages. A separator-derived track rather than a surface: the stepper is drawn
 * ON a surface, so a track painted in one is invisible against its host.
 */
const connector: ComponentFunction<StepperStyleProps> = (_props, ...etc) =>
  mx('relative grow min-w-1 rounded-full bg-separator', ...etc);

const fill: ComponentFunction<StepperStyleProps> = ({ failed }, ...etc) =>
  mx('absolute inset-y-0 start-0 rounded-full', failed ? 'bg-error-surface' : 'bg-accent-bg', ...etc);

export const stepperTheme: Theme<StepperStyleProps> = {
  root,
  item,
  step,
  notch,
  connector,
  fill,
};
