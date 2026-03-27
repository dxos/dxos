//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composable, composableProps, mx } from '@dxos/ui-theme';

export type FlexProps = { column?: boolean; grow?: boolean };

export const Flex = composable<HTMLDivElement, FlexProps>(
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
