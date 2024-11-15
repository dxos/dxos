//
// Copyright 2024 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import React, { type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack, useStackItem } from './StackContext';

export type StackItemHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

export const StackItemHeading = ({ children, classNames, ...props }: StackItemHeadingProps) => {
  const { orientation } = useStack();
  const { selfDragHandleRef } = useStackItem();
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });
  return (
    <div
      role='heading'
      {...props}
      tabIndex={0}
      {...focusableGroupAttrs}
      className={mx(
        'grid ch-focus-ring-inset-over-all relative',
        orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]',
        classNames,
      )}
      ref={selfDragHandleRef}
    >
      {children}
    </div>
  );
};
