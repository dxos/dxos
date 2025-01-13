//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './StackContext';

export type StackItemContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  toolbar: boolean;
  statusbar?: boolean;
  size?: 'intrinsic' | 'video' | 'square';
};

export const StackItemContent = forwardRef<HTMLDivElement, StackItemContentProps>(
  ({ children, toolbar = true, statusbar, classNames, size = 'intrinsic', ...props }, forwardedRef) => {
    const { size: stackItemSize } = useStack();

    return (
      <div
        role='none'
        {...props}
        className={mx(
          'group grid grid-cols-[100%]',
          stackItemSize === 'contain' && 'min-bs-0 overflow-hidden',
          size === 'video' ? 'aspect-video' : size === 'square' && 'aspect-square',
          classNames,
        )}
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
