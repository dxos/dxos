//
// Copyright 2026 DXOS.org
//

// `Stepper` — a fixed plan drawn as circles joined by lines, built on `@ark-ui/react`'s Steps
// (zag state machine). The machine owns which stage is complete, in flight or still ahead, and
// stamps that onto every part as `data-complete` / `data-current` / `data-incomplete` plus the
// item's `aria-current`. DXOS owns everything the machine has no notion of: how far through the
// stage in flight the run is, a stage that cannot be counted, a stage that failed, a stage the
// caller singled out, and the handover that holds an advance back until the line has arrived.

import { Steps, useStepsContext } from '@ark-ui/react/steps';
import React, { useEffect, useState } from 'react';

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
      <Steps.Root
        {...composableProps(props, { classNames: tx('stepper.root', {}), role: 'list' })}
        count={count + PHANTOM}
        step={machineStep(shown, count)}
        ref={forwardedRef}
      >
        <StepperItems
          steps={steps}
          count={count}
          fraction={indeterminate ? 0 : fraction}
          handover={handover}
          indeterminate={indeterminate}
          error={error}
          selected={selected}
          onSelect={onSelect}
          options={options}
        />
      </Steps.Root>
    );
  },
);

Stepper.displayName = 'Stepper';

//
// Parts
//

/**
 * The machine has no "not started" step — it throws on an index outside `0..count` — so the plan is
 * declared one stage longer than it is and every stage shifted up by one. Index 0 is that phantom
 * stage: the machine resting on it means nothing has claimed a real one, and every real stage reads
 * as ahead of the run.
 */
const PHANTOM = 1;

/** Where the machine rests, in its own (shifted) indices. */
const machineStep = (shown: number | undefined, count: number): number =>
  shown === undefined ? 0 : Math.min(Math.max(shown, 0) + PHANTOM, count + PHANTOM);

type StepperItemsProps = Required<Pick<StepperProps, 'steps' | 'fraction' | 'options'>> &
  Pick<StepperProps, 'indeterminate' | 'error' | 'selected' | 'onSelect'> & {
    count: number;
    handover: boolean;
  };

const StepperItems = ({
  steps,
  count,
  fraction,
  handover,
  indeterminate,
  error,
  selected,
  onSelect,
  options,
}: StepperItemsProps) => {
  const { tx } = useThemeContext();
  const api = useStepsContext();

  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const step = stepAt(steps, index);
        const { current, completed } = api.getItemState({ index: index + PHANTOM });
        const state = stepState(current, completed, handover, error);
        const last = index === count - 1;

        return (
          // The item stretches so its trailing line can flex; the last has no line to give it away.
          <Steps.Item key={step.id} index={index + PHANTOM} role='listitem' className={tx('stepper.item', { last })}>
            <Circle
              index={index}
              step={step}
              state={state}
              selected={selected === index}
              indeterminate={indeterminate}
              options={options}
              onClick={onSelect && (() => onSelect({ index, id: step.id }))}
            />
            {!last && (
              // The line leaving a stage carries that stage's progress: full once the run is past
              // it, fractional while it is the one in flight, empty ahead of it.
              <Steps.Separator className={tx('stepper.connector', {})} style={{ height: options.thickness }}>
                <div
                  className={tx('stepper.fill', { state: error ? 'error' : undefined })}
                  style={{
                    width: `${connectorFraction(completed, current, handover, fraction) * 100}%`,
                    // Only the line leaving the stage in flight eases, so an incremental advance
                    // glides rather than jumps. Every other line is already at its end or at
                    // nothing, and a run that is reset or wound back has to land there at once — a
                    // line sliding back to zero reads as progress in reverse.
                    transition: current ? `width ${options.duration}ms linear` : 'none',
                  }}
                />
              </Steps.Separator>
            )}
          </Steps.Item>
        );
      })}
    </>
  );
};

type CircleProps = {
  index: number;
  step: Step;
  state: StepState;
  selected?: boolean;
  indeterminate?: boolean;
  options: StepOptions;
  onClick?: () => void;
};

/** One stage: a circle, ringed by a spinning notch while it runs uncounted. */
const Circle = ({ index, step, state, selected, indeterminate, options, onClick }: CircleProps) => {
  const { tx } = useThemeContext();
  // A circle carries no text, and an anonymous plan supplies no label, so the position is the only
  // name the control can be given.
  const label = step.label?.trim() || `Step ${index + 1}`;
  const spinning = state === 'active' && !!indeterminate;

  return (
    <div className='relative shrink-0' style={{ width: options.size, height: options.size }}>
      {onClick ? (
        // A selectable stage is a real button, so it takes focus and answers the keyboard without a
        // key handler of its own; selection toggles, which is what `aria-pressed` describes. Not the
        // machine's own trigger: that is a `tab` pointing at a panel this stepper never renders.
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
 * drawing, and it is what the machine is told, so mid-handover the machine reads the stage being
 * left as the one in flight and everything after it as still ahead.
 *
 * Only an advance waits. Going back, or starting from nothing, has no line in flight to finish, so
 * it lands immediately — a reset that eased into place would read as progress.
 */
const useHandover = (active: number | undefined, duration: number) => {
  const [held, setHeld] = useState(active);

  // Derived rather than stored, so a retreat lands in the render that reports it. Waiting for an
  // effect to catch up leaves one painted frame with the run still drawn where it was — and since
  // the stage being left reads as complete in that frame, its line is drawn full, which is the
  // whole of what a reset is meant to clear.
  const advancing = active !== undefined && held !== undefined && active > held;
  const shown = advancing ? held : active;

  useEffect(() => {
    if (!advancing) {
      setHeld(active);
      return;
    }

    const timer = setTimeout(() => setHeld(active), duration);
    return () => clearTimeout(timer);
  }, [active, advancing, duration]);

  return { shown, handover: advancing };
};

/** How a stage is drawn, given what the machine says about it and where the run is. */
const stepState = (current: boolean, completed: boolean, handover: boolean, error: boolean | undefined): StepState => {
  if (completed) {
    return 'complete';
  }
  if (!current) {
    return 'pending';
  }
  // Mid-handover the stage is finished and the next has not started, so nothing is in flight: the
  // stage ahead stays uncoloured until its line has arrived.
  if (handover) {
    return 'complete';
  }
  return error ? 'error' : 'active';
};

/** How much of the line leaving a stage is drawn. */
const connectorFraction = (completed: boolean, current: boolean, handover: boolean, fraction: number): number => {
  if (completed) {
    return 1;
  }
  if (!current) {
    return 0;
  }
  // The run has already reported the next stage and is counting it: the line being waited on is the
  // one this stage is leaving, so it holds full rather than snapping back to the new count.
  return handover ? 1 : fraction;
};
