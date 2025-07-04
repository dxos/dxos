//
// Copyright 2025 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import type { ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { railGridHorizontalContainFitContent, Stack, type StackProps } from '../../components';
import { Card } from '../Card';

type SharedCardStackProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

const CardStackStack = forwardRef<
  HTMLDivElement,
  Omit<StackProps, 'orientation' | 'size' | 'rail' | 'separatorOnScroll'>
>(({ children, classNames, itemsCount = 0, ...props }, forwardedRef) => {
  return (
    <Stack
      orientation='vertical'
      size='contain'
      rail={false}
      classNames={
        /* NOTE(thure): Do not let this element have zero intrinsic size, otherwise the drop indicator will not display. See #9035. */
        ['plb-1', itemsCount > 0 && 'plb-2', classNames]
      }
      itemsCount={itemsCount}
      separatorOnScroll={9}
      data-density='fine'
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Stack>
  );
});

const CardStackDragHandle = Card.DragHandle;

const cardStackHeading = 'mli-2 order-first bg-transparent rounded-bs-md flex items-center';

const CardStackHeading = forwardRef<HTMLDivElement, SharedCardStackProps>(
  ({ children, classNames, asChild, role = 'heading', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardStackHeading, classNames] }
      : { className: mx(cardStackHeading, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const cardStackFooter =
  'plb-2 mli-2 border-bs border-transparent [[data-scroll-separator-end="true"]_&]:border-subduedSeparator';

const CardStackFooter = forwardRef<HTMLDivElement, SharedCardStackProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardStackFooter, classNames] }
      : { className: mx(cardStackFooter, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const cardStackContent = [
  'shrink min-bs-0 bg-baseSurface border border-separator rounded-md grid dx-focus-ring-group-x-indicator kanban-drop',
  railGridHorizontalContainFitContent,
];

const CardStackContent = forwardRef<HTMLDivElement, SharedCardStackProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [...cardStackContent, classNames] }
      : { className: mx(...cardStackContent, classNames), role };
    return (
      <Root {...props} {...rootProps} data-scroll-separator='false' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const cardStackRoot = 'flex flex-col pli-2 plb-2';

const CardStackRoot = forwardRef<HTMLDivElement, SharedCardStackProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardStackRoot, classNames] }
      : { className: mx(cardStackRoot, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

export const CardStack = {
  Root: CardStackRoot,
  Content: CardStackContent,
  Stack: CardStackStack,
  Heading: CardStackHeading,
  Footer: CardStackFooter,
  DragHandle: CardStackDragHandle,
};

export { cardStackRoot, cardStackFooter, cardStackHeading, cardStackContent };
