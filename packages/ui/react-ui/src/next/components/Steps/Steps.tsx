//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Steps as StepsPrimitive, useStepsContext } from '@ark-ui/react/steps';
import React, { type CSSProperties, forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import type * as Container from '../Container/Container.tsx';

/** One stage of a plan that has identity: a stage the caller can address and select. */
export type Step = {
  id: string;
  label?: string;
};

/** Where a stage sits relative to the run: ahead of it, in flight, behind it, or where it failed. */
export type StepState = 'pending' | 'active' | 'complete' | 'error';

export type StepsProps = ThemedClassName<
  Omit<StepsPrimitive.RootProps, 'children' | 'count' | 'step' | 'defaultStep' | 'onStepChange' | 'onSelect'>
> & {
  /** The plan: a count when the stages are anonymous, or the stages themselves; every stage is drawn. */
  steps: number | Step[];
  /**
   * Zero-based index of the stage in flight; absent means none has started, and a value at or past the last stage
   * means the run is over.
   */
  active?: number;
  /** How far through the stage in flight, 0..1, drawn on the line leaving it. */
  fraction?: number;
  /** The stage in flight cannot be counted, so it spins rather than filling its line. */
  indeterminate?: boolean;
  /** The run stopped on the stage in flight; every stage it reached is drawn in the error colour. */
  error?: boolean;
  /** Index of a stage the caller has singled out. */
  selected?: number;
  /** Makes every stage a toggle button. */
  onSelect?: (step: { index: number; id: string }) => void;
  /** Milliseconds a line takes to fill, and so how long an advance is held back for it to arrive. */
  duration?: number;
};

/**
 * The machine has no "not started" step (it throws on an index outside `0..count`), so the plan is declared one stage
 * longer and every stage shifted up by one: the machine resting on index 0 means nothing has started.
 */
const PHANTOM = 1;

/**
 * A fixed plan drawn as icon-sized circles joined by lines that flex, so the gaps stay even however many stages there
 * are. Which stage is in flight says where the run is in its plan; the fill of the line leaving it says how far through
 * that stage, so a counted run needs no separate bar (`Progress` is the planless form).
 */
export const Steps = forwardRef<HTMLDivElement, StepsProps>(
  (
    {
      classNames,
      steps,
      active,
      fraction = 0,
      indeterminate,
      error,
      selected,
      onSelect,
      duration = 500,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const count = stepCount(steps);
    const { shown, handover } = useHandover(active, duration);
    const rootStyle: CSSProperties & Container.CSSVariables = { ...style, '--dx-steps-duration': `${duration}ms` };

    return (
      <StepsPrimitive.Root
        {...props}
        role='list'
        count={count + PHANTOM}
        step={shown === undefined ? 0 : Math.min(Math.max(shown, 0) + PHANTOM, count + PHANTOM)}
        data-error={error ? '' : undefined}
        style={rootStyle}
        className={mx(recipes.steps(), classNames)}
        ref={forwardedRef}
      >
        <StepsItems
          steps={steps}
          count={count}
          fraction={indeterminate ? 0 : fraction}
          handover={handover}
          indeterminate={indeterminate}
          error={error}
          selected={selected}
          onSelect={onSelect}
        />
      </StepsPrimitive.Root>
    );
  },
);

Steps.displayName = 'Steps';

type StepsItemsProps = Pick<StepsProps, 'steps' | 'indeterminate' | 'error' | 'selected' | 'onSelect'> & {
  count: number;
  fraction: number;
  handover: boolean;
};

const StepsItems = ({
  steps,
  count,
  fraction,
  handover,
  indeterminate,
  error,
  selected,
  onSelect,
}: StepsItemsProps) => {
  const api = useStepsContext();
  const { t } = useTranslation(translationKey);

  return (
    <>
      {Array.from({ length: count }, (_unused, index) => {
        const step = stepAt(steps, index);
        const { current, completed } = api.getItemState({ index: index + PHANTOM });
        const state = stepState(current, completed, handover, error);
        const last = index === count - 1;
        // A circle carries no text and an anonymous plan supplies no label, so its position is the only name it has.
        const label = step.label?.trim() || t('steps.step.label', { index: index + 1 });
        const indicator = {
          'index': index + PHANTOM,
          'aria-label': label,
          // Ark hides its indicator from assistive tech; here the circle is the stage's only representation.
          'aria-hidden': false,
          'data-state': state,
          'data-selected': selected === index ? '' : undefined,
          'data-spinning': state === 'active' && indeterminate ? '' : undefined,
        } as const;

        return (
          <StepsPrimitive.Item
            key={step.id}
            index={index + PHANTOM}
            role='listitem'
            data-last={last ? '' : undefined}
            className={recipes.stepsItem()}
          >
            {onSelect ? (
              // A real button so it takes focus and answers the keyboard; selection toggles, which `aria-pressed`
              // describes. Not the machine's trigger, which is a `tab` for a panel this component never renders.
              <StepsPrimitive.Indicator {...indicator} className={recipes.stepsButton()} asChild>
                <button
                  type='button'
                  aria-pressed={selected === index}
                  onClick={() => onSelect({ index, id: step.id })}
                />
              </StepsPrimitive.Indicator>
            ) : (
              // A bare element maps to `generic`, where ARIA discards the label.
              <StepsPrimitive.Indicator {...indicator} role='img' className={recipes.stepsIndicator()} />
            )}
            {!last && (
              <StepsPrimitive.Separator className={recipes.stepsSeparator()}>
                <span
                  className={recipes.stepsFill()}
                  style={{
                    width: `${connectorFraction(completed, current, handover, fraction) * 100}%`,
                    // Only the line leaving the stage in flight eases; a reset or rewind lands at once, since a line
                    // sliding back to zero reads as progress in reverse.
                    transition: current ? undefined : 'none',
                  }}
                />
              </StepsPrimitive.Separator>
            )}
          </StepsPrimitive.Item>
        );
      })}
    </>
  );
};

/** Number of stages in a plan, whichever form it takes. */
const stepCount = (steps: number | Step[]): number => (typeof steps === 'number' ? steps : steps.length);

/** The stage at `index`, synthesizing an id for an anonymous plan. */
const stepAt = (steps: number | Step[], index: number): Step =>
  typeof steps === 'number' ? { id: `step-${index}` } : steps[index];

/**
 * Holds an advance back until the line leaving the stage being left has filled, so two things never animate at once.
 * Only an advance waits: a retreat or a start from nothing has no line in flight, and is derived (not stored) so it
 * lands in the render that reports it.
 */
const useHandover = (active: number | undefined, duration: number) => {
  const [held, setHeld] = useState(active);
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
  // Mid-handover the stage is finished and the next has not started, so nothing is in flight.
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
  // The run already counts the next stage, but the line being waited on is this one, so it holds full.
  return handover ? 1 : fraction;
};
