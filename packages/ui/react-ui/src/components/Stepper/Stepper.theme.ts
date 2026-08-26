//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

/** Where a stage sits relative to the run: behind it, in flight, ahead of it, or where it failed. */
export type StepState = 'pending' | 'active' | 'complete' | 'error';

export type StepperStyleProps = {
  state?: StepState;
  /** A stage the caller has singled out. */
  selected?: boolean;
  /** The stage can be clicked. */
  interactive?: boolean;
  /** The stage is running uncounted, so its circle is inset to leave room for the notch. */
  spinning?: boolean;
};

/** Circles ahead of the run read as an outline; everything the run has reached is filled. */
const stepFill: Record<StepState, string> = {
  pending: 'bg-base-surface border-separator',
  active: 'bg-primary-surface border-transparent',
  complete: 'bg-primary-surface border-transparent',
  error: 'bg-error-surface border-transparent',
};

const root: ComponentFunction<StepperStyleProps> = (_props, ...etc) => mx('flex items-center w-full min-w-0', ...etc);

const step: ComponentFunction<StepperStyleProps> = ({ state = 'pending', selected, interactive, spinning }, ...etc) =>
  mx(
    'absolute border rounded-full transition-all duration-200',
    // Drawn inset while it spins, so the notch reads as a ring around it rather than a collar.
    spinning ? 'inset-[3px]' : 'inset-0',
    interactive && 'cursor-pointer',
    selected ? 'bg-neutral-500 border-transparent' : stepFill[state],
    ...etc,
  );

const notch: ComponentFunction<StepperStyleProps> = (_props, ...etc) =>
  mx('dx-fullscreen animate-spin text-primary-surface', ...etc);

/**
 * The line between two stages. A separator-derived track rather than a surface: the stepper is drawn
 * ON a surface, so a track painted in one is invisible against its host.
 */
const connector: ComponentFunction<StepperStyleProps> = (_props, ...etc) =>
  mx('relative grow min-w-1 rounded-full bg-separator', ...etc);

const fill: ComponentFunction<StepperStyleProps> = ({ state }, ...etc) =>
  mx('absolute inset-y-0 start-0 rounded-full', state === 'error' ? 'bg-error-surface' : 'bg-primary-surface', ...etc);

export const stepperTheme: Theme<StepperStyleProps> = {
  root,
  step,
  notch,
  connector,
  fill,
};
