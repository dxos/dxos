//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useEffect, useState } from 'react';

import { useThemeContext } from '../../hooks';
import { type StepState } from '../../theme';
import { type ThemedClassName, composable, composableProps } from '../../util';

/** One stage of a plan that has identity — a stage the caller can address and select. */
export type Step = {
  id: string;
  label?: string;
};

export type StepOptions = {
  /** Diameter of a stage's circle. */
  size: number;
  /** Thickness of the line between stages. */
  thickness: number;
  /** Transition duration (ms) for a line's fill. */
  duration: number;
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
  /**
   * Zero-based index of the stage in flight; absent means none has claimed one yet, and a value at
   * or past the last stage means the run is over — every stage complete and nothing in flight.
   */
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
    { steps, active, fraction = 0, indeterminate, error, selected, onSelect, options = defaultStepOptions, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const count = stepCount(steps);
    const { shown, handover } = useHandover(active, options.duration);

    return (
      <div {...composableProps(props, { classNames: tx('stepper.root', {}), role: 'list' })} ref={forwardedRef}>
        {Array.from({ length: count }, (_, index) => (
          <Fragment key={stepAt(steps, index).id}>
            {index > 0 && (
              <Connector
                // The line leaving a stage carries that stage's progress: full once the run is past
                // it, fractional while it is the one in flight, empty ahead of it.
                fraction={connectorFraction(index - 1, shown, handover, indeterminate ? 0 : fraction)}
                error={error}
                options={options}
              />
            )}
            <Step
              index={index}
              step={stepAt(steps, index)}
              state={stepState(index, shown, handover, error)}
              selected={selected === index}
              indeterminate={indeterminate}
              options={options}
              onClick={onSelect && (() => onSelect({ index, id: stepAt(steps, index).id }))}
            />
          </Fragment>
        ))}
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
  error?: boolean;
  options: StepOptions;
};

/** The flexing line between two stages, filled to `fraction`. */
const Connector = ({ fraction, error, options }: ConnectorProps) => {
  const { tx } = useThemeContext();
  return (
    <div role='separator' className={tx('stepper.connector', {})} style={{ height: options.thickness }}>
      <div
        className={tx('stepper.fill', { state: error ? 'error' : undefined })}
        // Ease between updates so an incremental advance glides rather than jumps.
        style={{ width: `${fraction * 100}%`, transition: `width ${options.duration}ms linear` }}
      />
    </div>
  );
};

type StepProps = {
  index: number;
  step: Step;
  state: StepState;
  selected?: boolean;
  indeterminate?: boolean;
  options: StepOptions;
  onClick?: () => void;
};

/** One stage: a circle, ringed by a spinning notch while it runs uncounted. */
const Step = ({ index, step, state, selected, indeterminate, options, onClick }: StepProps) => {
  const { tx } = useThemeContext();
  // A circle carries no text, and an anonymous plan supplies no label, so the position is the only
  // name the control can be given.
  const label = step.label?.trim() || `Step ${index + 1}`;
  const spinning = state === 'active' && !!indeterminate;

  return (
    <div
      role='listitem'
      aria-current={state === 'active' ? 'step' : undefined}
      className='relative shrink-0'
      style={{ width: options.size, height: options.size }}
    >
      {onClick ? (
        // A selectable stage is a real button, so it takes focus and answers the keyboard without a
        // key handler of its own; selection toggles, which is what `aria-pressed` describes.
        <button
          type='button'
          aria-label={label}
          aria-pressed={!!selected}
          className={tx('stepper.step', { state, selected, interactive: true, spinning })}
          onClick={onClick}
        />
      ) : (
        // A bare div maps to `generic`, where ARIA discards the label.
        <div role='img' aria-label={label} className={tx('stepper.step', { state, selected, spinning })} />
      )}
      {spinning && <Notch className={tx('stepper.notch', { state })} />}
    </div>
  );
};

const Notch = ({ className }: { className?: string }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' className={className}>
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

/**
 * Holds the advance back until the line leaving the stage being left has finished filling.
 *
 * A run reports the next stage the moment it starts it, so without this the line is still travelling
 * to its end while the stage after it is already coloured and its own line already moving — two
 * things animating at once, and the first one never seen arriving. `shown` is the stage the chain is
 * drawing; `handover` says it is finishing the previous one rather than working the current one.
 *
 * Only an advance waits. Going back, or starting from nothing, has no line in flight to finish, so
 * it lands immediately — a reset that eased into place would read as progress.
 */
const useHandover = (active: number | undefined, duration: number) => {
  const [shown, setShown] = useState(active);
  useEffect(() => {
    if (active === undefined || shown === undefined || active <= shown) {
      setShown(active);
      return;
    }

    const timer = setTimeout(() => setShown(active), duration);
    return () => clearTimeout(timer);
  }, [active, shown, duration]);

  return { shown, handover: active !== undefined && shown !== undefined && active > shown };
};

const stepState = (
  index: number,
  shown: number | undefined,
  handover: boolean,
  error: boolean | undefined,
): StepState => {
  if (shown === undefined) {
    // No stage in flight: the plan is laid out but nothing has claimed one yet.
    return 'pending';
  }
  if (index < shown) {
    return 'complete';
  }
  if (index > shown) {
    return 'pending';
  }
  // Mid-handover the stage is finished and the next has not started, so nothing is in flight: the
  // stage ahead stays uncoloured until its line has arrived.
  if (handover) {
    return 'complete';
  }
  return error ? 'error' : 'active';
};

/** How much of the line leaving stage `index` is drawn. */
const connectorFraction = (index: number, shown: number | undefined, handover: boolean, fraction: number): number => {
  if (shown === undefined || index > shown) {
    return 0;
  }
  if (index < shown) {
    return 1;
  }
  // The line leaving the stage in flight: its own fraction, or all the way when handing over.
  return handover ? 1 : fraction;
};
