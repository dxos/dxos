//
// Copyright 2026 DXOS.org
//

import { Progress as ProgressPrimitive } from '@ark-ui/react/progress';
import React, { type CSSProperties, forwardRef, useEffect, useRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

export type ProgressProps = ThemedClassName<
  Omit<ProgressPrimitive.RootProps, 'value' | 'defaultValue' | 'min' | 'max' | 'children'>
> & {
  /** How far through, from 0 to `max`; ignored when `indeterminate` or `countdown`. */
  value?: number;
  /** Defaults to 1, so `value` is a fraction. */
  max?: number;
  /** A sweep for a task with nothing to count. */
  indeterminate?: boolean;
  /** Draws the range in the error colour, for a run that stopped where it got to. */
  error?: boolean;
  /** Milliseconds to empty the bar over, for a deadline rather than a task; hidden from assistive tech. */
  countdown?: number;
  /** Holds a `countdown` where it is. */
  paused?: boolean;
  /** Names the progressbar (`aria-label` on Ark's track). */
  label?: string;
};

/**
 * Ark's linear progress as a single thin bar: a track and its range, determinate, indeterminate or a countdown. A host
 * supplies any label or readout around it.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    { classNames, value = 0, max = 1, indeterminate, error, countdown, paused, label, style, ...props },
    forwardedRef,
  ) => {
    // A run with nothing to count cannot say how far it got, so a failure fills the bar and stops sweeping: motion
    // after the run is over reads as still working.
    const counting = !!countdown && Number.isFinite(countdown) && countdown > 0 && !indeterminate && !error;
    const mode = counting ? 'countdown' : indeterminate ? (error ? 'failed' : 'indeterminate') : 'determinate';

    // An advance eases; a rewind snaps, since sliding backwards animates a run that never happened.
    const previous = useRef(value);
    const rewound = value < previous.current;
    useEffect(() => {
      previous.current = value;
    }, [value]);

    const rangeStyle: CSSProperties | undefined = counting
      ? { animationDuration: `${countdown}ms`, animationPlayState: paused ? 'paused' : 'running' }
      : rewound
        ? { transition: 'none' }
        : undefined;

    return (
      <ProgressPrimitive.Root
        {...props}
        {...(counting && { 'aria-hidden': true })}
        value={mode === 'determinate' ? Math.min(max, Math.max(0, value)) : null}
        min={0}
        max={max}
        data-mode={mode}
        data-error={error ? '' : undefined}
        style={style}
        className={mx(recipes.progress(), classNames)}
        ref={forwardedRef}
      >
        <ProgressPrimitive.Track
          {...(counting ? { role: 'presentation' } : label ? { 'aria-label': label } : {})}
          className={recipes.progressTrack()}
        >
          <ProgressPrimitive.Range className={recipes.progressRange()} style={rangeStyle} />
        </ProgressPrimitive.Track>
      </ProgressPrimitive.Root>
    );
  },
);

Progress.displayName = 'Next.Progress';
