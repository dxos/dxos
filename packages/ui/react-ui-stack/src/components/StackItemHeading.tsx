//
// Copyright 2024 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { useAttention, type AttendableId, type Related } from '@dxos/react-ui-attention';
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
        'flex items-center ch-focus-ring-inset-over-all relative !border-is-0',
        orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]',
        classNames,
      )}
      ref={selfDragHandleRef}
    >
      {children}
    </div>
  );
};

export type StackItemHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId & Related;

export const StackItemHeadingLabel = forwardRef<HTMLHeadingElement, StackItemHeadingLabelProps>(
  ({ attendableId, related, classNames, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={((related && isRelated) || hasAttention || isAncestor).toString()}
        className={mx(
          'pli-1 min-is-0 is-0 grow truncate font-medium text-baseText data-[attention=true]:text-accentText',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);
