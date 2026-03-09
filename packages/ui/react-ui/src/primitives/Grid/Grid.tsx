//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type GridProps = ComposableProps<
  HTMLAttributes<HTMLDivElement> & {
    cols?: number;
    rows?: number;
    grow?: boolean;
  }
>;

export const Grid = ({
  children,
  classNames,
  className,
  style,
  role,
  cols,
  rows,
  grow = true,
  ...props
}: GridProps) => {
  return (
    <div
      {...props}
      role={role ?? 'none'}
      style={{
        gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : undefined,
        gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined,
        ...style,
      }}
      className={mx('grid overflow-hidden', grow && 'dx-container', className, classNames)}
    >
      {children}
    </div>
  );
};
