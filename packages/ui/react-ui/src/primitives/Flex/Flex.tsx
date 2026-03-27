//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composable, composableProps, mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

type FlexOwnProps = { column?: boolean; grow?: boolean };

export type FlexProps = ComposableProps<FlexOwnProps>;

export const Flex = composable<HTMLDivElement, FlexOwnProps>(({ children, column, grow, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { role: 'none' });
  return (
    <div
      ref={forwardedRef}
      {...rest}
      className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', className)}
    >
      {children}
    </div>
  );
});
