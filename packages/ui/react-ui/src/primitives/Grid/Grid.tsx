//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { composableProps, mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type GridProps = ComposableProps<HTMLDivElement> & {
  cols?: number;
  rows?: number;
  grow?: boolean;
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, style, role, cols, rows, grow = true, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    return (
      <div
        ref={forwardedRef}
        {...rest}
        role={role ?? 'none'}
        className={mx('grid overflow-hidden', grow && 'dx-container', className)}
        style={{
          gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : undefined,
          gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined,
          ...style,
        }}
      >
        {children}
      </div>
    );
  },
);
