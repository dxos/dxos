//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ProgressStyleProps } from '../../theme';
import { type ThemedClassName } from '../../util';

import { ProgressSteps } from './ProgressSteps';

type ProgressBarProps = ThemedClassName<
  ComponentPropsWithRef<'span'> &
    ProgressStyleProps & {
      progress?: number;
    }
>;

/**
 * A bare fill bar: a fraction of a track, or an indeterminate sweep.
 *
 * The smallest thing that reports progress, for a host that supplies its own chrome (a panel footer,
 * an image placeholder). {@link ProgressRoot} is the full readout built on top of it.
 */
const ProgressBar = forwardRef<HTMLSpanElement, ProgressBarProps>(
  ({ classNames, children, progress = 0, indeterminate, variant, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <span
        role='status'
        {...props}
        className={tx('progress.root', { indeterminate, variant }, classNames)}
        ref={forwardedRef}
      >
        <span
          className={tx('progress.bar', { indeterminate, variant }, classNames)}
          {...(!indeterminate && { style: { width: `${Math.round(progress * 100)}%` } })}
        />
        {children}
      </span>
    );
  },
);

ProgressBar.displayName = 'Progress.Bar';

export const Progress = {
  Bar: ProgressBar,
  Steps: ProgressSteps,
};

export type { ProgressBarProps };
