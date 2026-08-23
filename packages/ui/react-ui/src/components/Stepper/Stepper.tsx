//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName, composable, composableProps } from '../../util';

/** One stage of a plan that has identity — a stage the caller can address and select. */
export type Step = {
  id: string;
  label?: string;
};

/**
 * What one stage is doing: `complete` is behind the run, `active` the one in flight, `pending` ahead
 * of it, `error` the one it stopped on.
 */
export type StepState = 'pending' | 'active' | 'complete' | 'error';

export type StepSlots = Partial<Record<StepState | 'selected' | 'track' | 'fill', string>>;

export type StepOptions = {
  /** Diameter of a stage's circle. */
  size: number;
  /** Thickness of the line between stages. */
  thickness: number;
  /** Transition duration (ms) for a line's fill. */
  duration: number;
};

export const defaultStepSlots: StepSlots = {
  pending: 'bg-base-surface border-separator',
  active: 'bg-primary-surface border-transparent text-primary-surface',
  complete: 'bg-primary-surface border-transparent',
  error: 'bg-error-surface border-transparent',
  selected: 'bg-neutral-500 border-transparent',
  track: 'bg-separator',
  fill: 'bg-primary-surface',
};

export const defaultStepOptions: StepOptions = {
  size: 15,
  thickness: 2,
  duration: 500,
};

export type StepperProps = ThemedClassName<{
  /**
   * The plan: a count when the stages are anonymous, or the stages themselves when they have
   * identity. Either way the number is fixed and every stage is drawn.
   */
  steps: number | Step[];
  /** Zero-based index of the stage in flight; absent means none has claimed one yet. */
  active?: number;
  /** How far through the stage in flight, 0..1. Drawn on the line leaving that stage. */
  fraction?: number;
  /** The stage in flight cannot be counted: it spins rather than filling its line. */
  indeterminate?: boolean;
  /** The run stopped on the stage in flight. */
  error?: boolean;
  /** Index of a stage the caller has singled out. */
  selected?: number;
  onSelect?: (step: { index: number; id: string }) => void;
  classes?: StepSlots;
  options?: StepOptions;
}>;

/**
 * A fixed plan, drawn as circles joined by lines.
 *
 * ```
 * (o)————(o)————(*)- - - ( )- - - ( )
 * ```
 *
 * The lines flex, so the stages spread across whatever width the stepper is given and the gaps stay
 * even however many there are.
 *
 * Two readings on one drawing: which stage is in flight says where the run is in its plan, and the
 * fill of the line leaving that stage says how far through it — so a counted run needs no separate
 * bar. A stage with nothing to count cannot be drawn that way, so it spins instead, which is the
 * honest reading rather than a line resting at a number that means nothing.
 */
export const Stepper = composable<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      active,
      fraction = 0,
      indeterminate,
      error,
      selected,
      onSelect,
      classes = defaultStepSlots,
      options = defaultStepOptions,
      ...props
    },
    forwardedRef,
  ) => {
    const count = stepCount(steps);

    return (
      <div
        {...composableProps(props, { classNames: 'flex items-center w-full min-w-0', role: 'list' })}
        ref={forwardedRef}
      >
        {Array.from({ length: count }, (_, index) => {
          const state = stepState(index, active, error);
          return (
            <React.Fragment key={stepAt(steps, index).id}>
              {index > 0 && (
                <Connector
                  // The line leaving a stage carries that stage's progress: full once the run is
                  // past it, fractional while it is the one in flight, empty ahead of it.
                  fraction={connectorFraction(stepState(index - 1, active, error), indeterminate ? 0 : fraction)}
                  classes={classes}
                  options={options}
                />
              )}
              <Step
                step={stepAt(steps, index)}
                state={state}
                selected={selected === index}
                indeterminate={indeterminate}
                classes={classes}
                options={options}
                onClick={onSelect && (() => onSelect({ index, id: stepAt(steps, index).id }))}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);

Stepper.displayName = 'Stepper';

//
// Parts
//

type ConnectorProps = {
  fraction: number;
  classes?: StepSlots;
  options: StepOptions;
};

/** The flexing line between two stages, filled to `fraction`. */
const Connector = ({ fraction, classes, options }: ConnectorProps) => (
  <div
    role='separator'
    className={mx('relative grow min-w-1 rounded-full', classes?.track)}
    style={{ height: options.thickness }}
  >
    <div
      className={mx('absolute inset-y-0 start-0 rounded-full', classes?.fill)}
      // Ease between updates so an incremental advance glides rather than jumps.
      style={{ width: `${fraction * 100}%`, transition: `width ${options.duration}ms linear` }}
    />
  </div>
);

type StepProps = {
  step: Step;
  state: StepState;
  selected?: boolean;
  indeterminate?: boolean;
  classes?: StepSlots;
  options: StepOptions;
  onClick?: () => void;
};

/** One stage: a circle, ringed by a spinning notch while it runs uncounted. */
const Step = ({ step, state, selected, indeterminate, classes, options, onClick }: StepProps) => {
  const spinning = state === 'active' && !!indeterminate;

  return (
    <div
      role='listitem'
      aria-label={step.label}
      aria-current={state === 'active' ? 'step' : undefined}
      className='relative shrink-0'
      style={{ width: options.size, height: options.size }}
    >
      <div
        className={mx(
          'absolute border rounded-full transition-all duration-500',
          // Drawn inset while it spins, so the notch reads as a ring around it rather than a collar.
          spinning ? 'inset-[3px]' : 'inset-0',
          onClick && 'cursor-pointer',
          selected ? classes?.selected : classes?.[state],
        )}
        onClick={onClick}
      />
      {spinning && <Notch classNames={['dx-fullscreen animate-spin', classes?.active, '!bg-transparent']} />}
    </div>
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

//
// Util
//

/** Number of stages in a plan, whichever form it takes. */
export const stepCount = (steps: number | Step[] | undefined): number =>
  steps === undefined ? 0 : typeof steps === 'number' ? steps : steps.length;

/** The stage at `index`, synthesizing an id for an anonymous plan. */
export const stepAt = (steps: number | Step[] | undefined, index: number): Step =>
  typeof steps === 'number' || steps === undefined ? { id: `step-${index}` } : steps[index];

const stepState = (index: number, active: number | undefined, error: boolean | undefined): StepState => {
  if (active === undefined) {
    // No stage in flight: the plan is laid out but nothing has claimed one yet.
    return 'pending';
  }
  if (index < active) {
    return 'complete';
  }
  if (index > active) {
    return 'pending';
  }
  return error ? 'error' : 'active';
};

/** How much of the line leaving a stage is drawn, from that stage's own state. */
const connectorFraction = (previous: StepState, fraction: number): number =>
  previous === 'complete' ? 1 : previous === 'active' ? fraction : 0;
