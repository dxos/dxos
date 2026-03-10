//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type FlexProps = ComposableProps<
  HTMLAttributes<HTMLDivElement> & {
    column?: boolean;
    grow?: boolean;
  }
>;

export const Flex = ({ children, classNames, className, role, column, grow, ...props }: FlexProps) => {
  return (
    <div
      {...props}
      role={role ?? 'none'}
      className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', className, classNames)}
    >
      {children}
    </div>
  );
};
