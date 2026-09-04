//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef, useEffect, useRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ProgressStyleProps } from '../../theme';
import { type ThemedClassName } from '../../util';

export type ProgressProps = ThemedClassName<
  ComponentPropsWithRef<'span'> &
    Omit<ProgressStyleProps, 'countdown'> & {
      /** How far through, 0..1. Ignored when `indeterminate` or `countdown`. */
      progress?: number;
      /** Milliseconds to empty the bar over, for a deadline rather than a task. */
      countdown?: number;
      /** Holds a `countdown` where it is, for a deadline that has stopped running down. */
      paused?: boolean;
    }
>;

/**
 * A fill bar: a fraction of a track, or an indeterminate sweep, for a host that supplies its own
 * chrome. {@link Stepper} draws a plan instead, and `ProgressMeter` is the readout built from both.
 */
export const Progress = forwardRef<HTMLSpanElement, ProgressProps>(
  ({ classNames, children, progress = 0, indeterminate, countdown, paused, error, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    // A run with nothing to count cannot say how far it got, so a failure fills the whole bar: what
    // is being reported is the failure, not a fraction. It stops sweeping for the same reason —
    // motion after the run is over reads as still working.
    const sweeping = !!indeterminate && !error;
    // A countdown that never ends has nothing to show, and one already spent has nothing left.
    const counting = !!countdown && Number.isFinite(countdown) && countdown > 0 && !indeterminate && !error;
    const fraction = indeterminate ? (error ? 1 : 0) : progress;
    // An advance eases; a rewind snaps. Sliding the fill backwards animates a run that never
    // happened, and a reset that takes half a second to land reads as still-running.
    const previousRef = useRef(fraction);
    const rewound = fraction < previousRef.current;
    useEffect(() => {
      previousRef.current = fraction;
    }, [fraction]);

    return (
      <span
        // A countdown empties in CSS, so its value never reaches assistive technology; the deadline
        // it illustrates belongs to the host, which announces it. An indeterminate bar is a
        // progressbar with no value — that is what the role means, so it needs no separate
        // live-region role.
        {...(counting ? { 'aria-hidden': true } : { role: 'progressbar' })}
        {...(!indeterminate && !counting && { 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': progress })}
        {...props}
        className={tx('progress.root', { indeterminate: sweeping, countdown: counting, error }, classNames)}
        ref={forwardedRef}
      >
        <span
          className={tx('progress.bar', { indeterminate: sweeping, countdown: counting, error })}
          {...(counting
            ? { style: { animationDuration: `${countdown}ms`, animationPlayState: paused ? 'paused' : 'running' } }
            : !sweeping && {
                style: { width: `${Math.round(fraction * 100)}%`, ...(rewound && { transition: 'none' }) },
              })}
        />
        {children}
      </span>
    );
  },
);

Progress.displayName = 'Progress';
