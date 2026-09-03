//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef, useEffect, useRef } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ProgressStyleProps } from '../../theme/index.ts';
import { type ThemedClassName } from '../../util/index.ts';

export type ProgressProps = ThemedClassName<
  ComponentPropsWithRef<'span'> &
    ProgressStyleProps & {
      /** How far through, 0..1. Ignored when `indeterminate`. */
      progress?: number;
    }
>;

/**
 * A fill bar: a fraction of a track, or an indeterminate sweep, for a host that supplies its own
 * chrome. {@link Stepper} draws a plan instead, and `ProgressMeter` is the readout built from both.
 */
export const Progress = forwardRef<HTMLSpanElement, ProgressProps>(
  ({ classNames, children, progress = 0, indeterminate, error, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    // A run with nothing to count cannot say how far it got, so a failure fills the whole bar: what
    // is being reported is the failure, not a fraction. It stops sweeping for the same reason —
    // motion after the run is over reads as still working.
    const sweeping = !!indeterminate && !error;
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
        // An indeterminate bar is a progressbar with no value — that is what the role means, so it
        // needs no separate live-region role.
        role='progressbar'
        {...(!indeterminate && { 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': progress })}
        {...props}
        className={tx('progress.root', { indeterminate: sweeping, error }, classNames)}
        ref={forwardedRef}
      >
        <span
          className={tx('progress.bar', { indeterminate: sweeping, error })}
          {...(!sweeping && {
            style: { width: `${Math.round(fraction * 100)}%`, ...(rewound && { transition: 'none' }) },
          })}
        />
        {children}
      </span>
    );
  },
);

Progress.displayName = 'Progress';
