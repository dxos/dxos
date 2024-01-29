//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, type ComponentPropsWithRef, type ForwardedRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import type { ThreadEntity } from '../types';

export type ThreadProps = ThreadEntity &
  ThemedClassName<ComponentPropsWithRef<'div'>> & { current?: boolean | ComponentProps<'div'>['aria-current'] };

export const Thread = forwardRef(
  ({ current, children, classNames, ...props }: ThreadProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div
        role='group'
        {...(current && { 'aria-current': typeof current === 'string' ? current : 'location' })}
        {...props}
        className={mx(
          'grid grid-cols-[3rem_1fr] bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be attention attention-within attention-current',
          classNames,
        )}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
