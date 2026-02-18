//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type StatusProps = ThemedClassName<ComponentPropsWithRef<'span'>> & {
  indeterminate?: boolean;
  variant?: 'default' | 'main-bottom';
  progress?: number;
};

const Status = forwardRef<HTMLSpanElement, StatusProps>(
  ({ classNames, children, progress = 0, indeterminate, variant, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <span
        role='status'
        {...props}
        className={tx('status.root', { indeterminate, variant }, classNames)}
        ref={forwardedRef}
      >
        <span
          role='none'
          className={tx('status.bar', { indeterminate, variant }, classNames)}
          {...(!indeterminate && { style: { width: `${Math.round(progress * 100)}%` } })}
        />
        {children}
      </span>
    );
  },
);

export { Status };

export type { StatusProps };
