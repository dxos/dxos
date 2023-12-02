//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type StatusProps = ThemedClassName<ComponentPropsWithRef<'span'>> & {
  indeterminate?: boolean;
  progress?: number;
};

const Status = forwardRef<HTMLSpanElement, StatusProps>(
  ({ classNames, children, progress = 0, indeterminate, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <span
        role='status'
        {...props}
        className={tx('status.root', 'status', { indeterminate }, classNames)}
        ref={forwardedRef}
      >
        <span
          role='none'
          className={tx('status.bar', 'status__bar', { indeterminate }, classNames)}
          {...(!indeterminate && { style: { width: `${Math.round(progress * 100)}%` } })}
        />
        {children}
      </span>
    );
  },
);

export { Status };

export type { StatusProps };
