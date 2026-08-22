//
// Copyright 2025 DXOS.org
//

import { AnimatePresence } from 'motion/react';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

import { type StepOptions, Steps, type StepSlots, defaultStepOptions, defaultStepSlots, deriveSteps } from './Steps';
import { type ProgressProps, stepCount } from './types';

// TODO(burdon): Show predicted nodes faded out.

export type ProgressStepsProps = ThemedClassName<
  ProgressProps & {
    classes?: StepSlots;
    options?: StepOptions;
  }
>;

/**
 * A run's plan, drawn as connected circles — no label, no counts, no chrome.
 *
 * ```
 * ---O---O---O---((O))
 * ```
 *
 * Only the tail that fits is drawn, so a run whose plan outgrows the available width keeps showing
 * where it is rather than shrinking every step to nothing. Takes the same {@link ProgressState} as
 * {@link ProgressRoot}, which draws it alongside the bar; on its own it is the whole readout for a
 * run whose only countable axis is which step it is on.
 *
 * Height is the caller's, so the chain can sit in a fixed-height row without changing it. Width is
 * its own: it caps at the plan's natural size and shrinks from there, since a chain given no width
 * at all measures zero and draws nothing.
 */
export const ProgressSteps = ({
  state,
  selected,
  onSelect,
  classNames,
  classes = defaultStepSlots,
  options = defaultStepOptions,
}: ProgressStepsProps) => {
  const { ref, width } = useResizeDetector();

  const count = stepCount(state.phases);
  const visible = Math.max(0, Math.floor((width ?? 0) / options.width));
  // Anchor on the end: the step in flight is the one worth seeing, and it is at the tail.
  const from = Math.max(0, count - visible);
  const steps = deriveSteps(state, { selected, from });

  return (
    <AnimatePresence>
      <div
        className={mx('flex items-center grow min-w-0 overflow-hidden', classNames)}
        style={{ maxWidth: count * options.width }}
        ref={ref}
      >
        <Steps steps={steps} classes={classes} options={options} onSelect={onSelect} />
      </div>
    </AnimatePresence>
  );
};

ProgressSteps.displayName = 'Progress.Steps';
