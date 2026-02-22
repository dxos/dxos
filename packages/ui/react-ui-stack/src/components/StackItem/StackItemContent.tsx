//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useStack, useStackItem } from '../StackContext';

export type StackItemContentProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'role' | 'scrollable'>> & {
  toolbar?: boolean;
  statusbar?: boolean;
};

/**
 * This component should be used by plugins for rendering content within a stack item (i.e., a “plank” or “section”).
 */
export const StackItemContent = forwardRef<HTMLDivElement, StackItemContentProps>(
  ({ classNames, children, toolbar, statusbar, ...props }, forwardedRef) => {
    const { size: stackItemSize } = useStack();
    const { role } = useStackItem();
    const style = useMemo(
      () => ({
        gridTemplateRows: [
          toolbar && role === 'section' ? 'calc(var(--toolbar-size) - 1px)' : 'var(--toolbar-size)',
          '1fr',
          statusbar && 'var(--statusbar-size)',
        ]
          .filter(Boolean)
          .join(' '),
      }),
      [toolbar, statusbar],
    );

    return (
      <div
        {...props}
        role='none'
        style={style}
        className={mx(
          'group grid grid-cols-[100%] density-coarse',
          stackItemSize === 'contain' && 'min-block-0 overflow-hidden',
          toolbar &&
            role === 'section' &&
            '[&_.dx-toolbar]:sticky [&_.dx-toolbar]:z-[1] [&_.dx-toolbar]:top-0 [&_.dx-toolbar]:-mb-px [&_.dx-toolbar]:min-inline-0',
          toolbar && '[&>.dx-toolbar]:relative [&>.dx-toolbar]:border-be [&>.dx-toolbar]:border-subduedSeparator',
          classNames,
        )}
        data-popover-collision-boundary={true}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

StackItemContent.displayName = 'StackItemContent';
