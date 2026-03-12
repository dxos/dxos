//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { composableProps, mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type FlexProps = ComposableProps<HTMLDivElement> & {
  column?: boolean;
  grow?: boolean;
};

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ children, role, column, grow, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    return (
      <div
        ref={forwardedRef}
        {...rest}
        role={role ?? 'none'}
        className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', className)}
      >
        {children}
      </div>
    );
  },
);
