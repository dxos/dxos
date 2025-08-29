//
// Copyright 2025 DXOS.org
//

import React, { type HTMLAttributes, type PropsWithChildren, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type FlexProps = ThemedClassName<
  PropsWithChildren<
    {
      column?: boolean;
    } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>
  >
>;

// TODO(burdon): Move to react-ui.
export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ classNames, children, column, ...props }, forwardedRef) => {
    return (
      <div role='none' className={mx('flex', column && 'flex-col', classNames)} ref={forwardedRef} {...props}>
        {children}
      </div>
    );
  },
);
