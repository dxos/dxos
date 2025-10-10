//
// Copyright 2024 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  forwardRef,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from '../StackContext';

export type StackItemHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  asChild?: boolean;
  separateOnScroll?: boolean;
};

export const StackItemHeading = ({
  children,
  classNames,
  asChild,
  separateOnScroll,
  ...props
}: StackItemHeadingProps) => {
  const { orientation } = useStack();

  const Root = asChild ? Slot : 'div';

  return (
    <Root
      role='heading'
      {...props}
      className={mx(
        'flex items-center !border-is-0 bg-headerSurface',
        separateOnScroll
          ? 'border-transparent [[data-scroll-separator="true"]_&]:border-subduedSeparator'
          : 'border-subduedSeparator',
        orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size] flex-col',
        orientation === 'horizontal' ? 'border-be' : 'border-ie',
        classNames,
      )}
    >
      {children}
    </Root>
  );
};

export const StackItemHeadingStickyContent = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div role='none' className='sticky block-start-0 bg-[--sticky-bg] p-1 is-full'>
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
          'pli-1 min-is-0 is-0 grow truncate font-medium text-baseText data-[attention=true]:text-accentText self-center',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);
