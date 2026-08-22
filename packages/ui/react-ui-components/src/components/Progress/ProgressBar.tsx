//
// Copyright 2025 DXOS.org
//

import { AnimatePresence } from 'motion/react';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type StepOptions, Steps, type StepSlots, defaultStepOptions, defaultStepSlots, deriveSteps } from './Steps';
import { type ProgressProps, stepCount } from './types';

// TODO(burdon): Show predicted nodes faded out.

export type ProgressBarProps = ThemedClassName<
  ProgressProps & {
    classes?: StepSlots;
    options?: StepOptions;
  }
>;

/**
 * Progress as steps alone — no label, no counts, no chrome.
 *
 * ```
 * ---O---O---O---((O))
 * ```
 *
 * Only the tail that fits is drawn, so a run whose plan outgrows the available width keeps showing
 * where it is rather than shrinking every step to nothing. Takes the same {@link ProgressState} as
 * {@link ProgressMeter}: one is the bare chain, the other the chain in its full readout, and a caller
 * can swap between them without rewriting its props.
 */
export const ProgressBar = ({
  state,
  selected,
  onSelect,
  classNames,
  classes = defaultStepSlots,
  options = defaultStepOptions,
}: ProgressBarProps) => {
  const { ref, width } = useResizeDetector();

  const count = stepCount(state.phases);
  const visible = Math.max(0, Math.floor((width ?? 0) / options.width));
  // Anchor on the end: the step in flight is the one worth seeing, and it is at the tail.
  const from = Math.max(0, count - visible);
  const steps = deriveSteps(state, { selected, from });

  return (
    <AnimatePresence>
      <div className={mx('flex items-center w-full h-[32px] overflow-hidden', classNames)} ref={ref}>
        <Steps steps={steps} classes={classes} options={options} onSelect={onSelect} />
      </div>
    </AnimatePresence>
  );
};

ProgressBar.displayName = 'ProgressBar';
