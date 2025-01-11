//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './StackContext';

export type StackItemContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  toolbar?: boolean;
  statusbar?: boolean;
};

export const StackItemContent = forwardRef<HTMLDivElement, StackItemContentProps>(
  ({ children, toolbar = true, statusbar, classNames, ...props }, forwardedRef) => {
    const { size } = useStack();

    return (
      <div
        role='none'
        {...props}
        className={mx('group grid grid-cols-[100%]', size === 'contain' && 'min-bs-0 overflow-hidden', classNames)}
        style={{
          gridTemplateRows: [
            ...(toolbar ? ['var(--rail-action)'] : []),
            '1fr',
            ...(statusbar ? ['var(--statusbar-size)'] : []),
          ].join(' '),
        }}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);
