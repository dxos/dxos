//
// Copyright 2025 DXOS.org
//

import React, { type HTMLAttributes, type PropsWithChildren, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Move to react-ui.

export type FlexProps = ThemedClassName<
  PropsWithChildren<
    {
      column?: boolean;
      scroll?: boolean;
      grow?: boolean;
    } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>
  >
>;

/**
 * @deprecated See radix-ui
 */
export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ classNames, children, column, scroll, grow, role = 'none', ...props }, forwardedRef) => {
    return (
      <div
        role={role}
        className={mx(
          'flex',
          grow && 'flex-1 overflow-hidden',
          column && 'flex-col',
          scroll && (column ? 'overflow-y-auto pie-3' : 'overflow-x-auto'),
          classNames,
        )}
        ref={forwardedRef}
        {...props}
      >
        {children}
      </div>
    );
  },
);
