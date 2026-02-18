//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

export type FlexProps = ThemedClassName<
  HTMLAttributes<HTMLDivElement> & {
    column?: boolean;
    grow?: boolean;
  }
>;

export const Flex = ({ children, classNames, role, column, grow }: FlexProps) => {
  return (
    <div
      role={role ?? 'none'}
      className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', classNames)}
    >
      {children}
    </div>
  );
};
