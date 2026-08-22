//
// Copyright 2026 DXOS.org
//

import { motion } from 'motion/react';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

import { type ProgressState, type ProgressStatus, stepAt, stepCount } from './types';

/**
 * What one step is doing. `closed` is a step that has not been revealed yet (it animates open),
 * `open` one that is done, `active` the one in flight, `terminal` the last of a finished run.
 */
export type StepState = 'closed' | 'open' | 'active' | 'terminal' | 'error';

export type StepSlots = Partial<Record<StepState | 'default' | 'selected', string>>;

export type StepOptions = {
  /** Horizontal advance per step, including its connector. */
  width: number;
  radius: number;
  /** Animation duration (ms). */
  duration: number;
};

export const defaultStepSlots: StepSlots = {
  default: 'bg-base-surface border-subdued-separator',
  active: 'bg-amber-500 border-transparent text-amber-500',
  terminal: 'bg-primary-500 border-transparent',
  selected: 'bg-neutral-500 border-transparent',
  error: 'bg-rose-500 border-transparent',
};

export const defaultStepOptions: StepOptions = {
  width: 32,
  radius: 7.5,
  duration: 250,
};

export type StepsProps = ThemedClassName<{
  /** One entry per step, in order. */
  steps: { id: string; state: StepState; selected?: boolean }[];
  classes?: StepSlots;
  options?: StepOptions;
  onSelect?: (step: { index: number; id: string }) => void;
}>;

/**
 * A chain of steps, drawn as connected circles.
 *
 * ```
 * ---O---O---O---((O))
 * ```
 *
 * Purely presentational and fully controlled: the caller decides what each step's state is. That is
 * what lets one primitive serve both a run with a known plan (N phases, the current one active) and
 * one that grows a step at a time — the difference is entirely in the array handed in.
 */
export const Steps = ({
  steps,
  classNames,
  classes = defaultStepSlots,
  options = defaultStepOptions,
  onSelect,
}: StepsProps) => (
  <div className={mx('flex items-center', classNames)} role='list'>
    {steps.map((step, index) => (
      <Step
        key={step.id}
        state={step.state}
        selected={step.selected}
        classes={classes}
        options={options}
        onClick={onSelect && (() => onSelect({ index, id: step.id }))}
      />
    ))}
  </div>
);

Steps.displayName = 'Steps';

type StepProps = {
  state: StepState;
  selected?: boolean;
  classes?: StepSlots;
  options?: StepOptions;
  onClick?: () => void;
};

/**
 * One step: a connector and its circle.
 *
 * ```
 * ---(O)
 * ```
 */
const Step = ({ state, selected, classes, options = defaultStepOptions, onClick }: StepProps) => {
  const { width, radius, duration } = options;
  const transition = { duration: duration / 1_000 };
  const closed = state === 'closed';

  return (
    <motion.div
      role='listitem'
      transition={transition}
      animate={state}
      initial={{ width: closed ? 0 : width }}
      variants={{ closed: { width: 0 }, open: { width } }}
    >
      <div className='relative flex flex-1 items-center'>
        <motion.div
          transition={transition}
          animate={closed ? 'closed' : 'open'}
          initial={{ width: closed ? 0 : width - radius }}
          variants={{ closed: { width: 0 }, open: { width: width - radius } }}
          className={mx('absolute left-0 border-b border-subdued-separator box-border', closed && 'hidden')}
        />
        <motion.div
          transition={transition}
          animate={closed ? 'closed' : 'open'}
          initial={{ width: closed ? 0 : radius * 2, height: closed ? 0 : radius * 2 }}
          variants={{ closed: { width: 0, height: 0 }, open: { width: radius * 2, height: radius * 2 } }}
          className={mx('flex absolute right-0', closed && 'hidden')}
        >
          <div
            className={mx(
              'absolute border rounded-full transition-all duration-500',
              // The active step is drawn inset so the spinning notch reads as a ring around it.
              state === 'active' ? 'inset-[4px]' : 'inset-0',
              onClick && 'cursor-pointer',
              selected ? classes?.selected : (classes?.[state] ?? classes?.default),
            )}
            onClick={onClick}
          />
          {state === 'active' && (
            <Notch classNames={['dx-fullscreen animate-spin', classes?.active, '!bg-transparent']} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const Notch = ({ classNames }: ThemedClassName) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' className={mx(classNames)}>
    <circle
      cx='128'
      cy='128'
      r='108'
      strokeDasharray='500 800'
      strokeDashoffset='0'
      fill='none'
      strokeWidth='40'
      stroke='currentColor'
    />
  </svg>
);

/**
 * Step states for a plan, derived from the shared {@link ProgressState}.
 *
 * `revealed` bounds how many steps are drawn — an unbounded run only shows the tail that fits, and the
 * ones before it animate closed rather than disappearing.
 */
export const deriveSteps = (
  state: ProgressState,
  options: { selected?: number; from?: number; to?: number } = {},
): StepsProps['steps'] => {
  const count = stepCount(state.phases);
  const from = options.from ?? 0;
  const to = options.to ?? count;
  const { phase, status } = state;

  return Array.from({ length: Math.max(0, to - from) }, (_, offset) => {
    const index = from + offset;
    return {
      ...stepAt(state.phases, index),
      selected: options.selected === index,
      state: stepState(index, phase, status),
    };
  });
};

const stepState = (index: number, phase: number | undefined, status: ProgressStatus | undefined): StepState => {
  if (phase === undefined) {
    // No phase in flight: the plan is laid out but nothing has claimed a step yet.
    return 'open';
  }
  if (index < phase) {
    return 'terminal';
  }
  if (index > phase) {
    return 'open';
  }
  // The step in flight carries the run's status: spinning while running, red when it failed there.
  return status === 'error' ? 'error' : status === 'running' || status === 'pending' ? 'active' : 'terminal';
};
