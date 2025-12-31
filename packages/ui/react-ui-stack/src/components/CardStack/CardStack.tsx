//
// Copyright 2025 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import type { ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Card } from '../Card';
import { Stack, type StackProps, railGridHorizontalContainFitContent } from '../Stack';

//
// Root
//

const cardStackRoot = 'flex flex-col';

// TODO(burdon): Root should be headless.
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

//
// Content
// TODO(burdon): Rename Viewport (should be the component that scrolls).
//

const cardStackContent = 'shrink min-bs-0 grid dx-focus-ring-group-x-indicator bg-baseSurface';

type CardStackContentProps = SharedCardStackProps & {
  footer?: boolean;
};

const CardStackContent = forwardRef<HTMLDivElement, CardStackContentProps>(
  ({ children, classNames, asChild, role = 'none', footer, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const baseClassNames = footer ? [cardStackContent, railGridHorizontalContainFitContent] : [cardStackContent];
    const rootProps = asChild
      ? { classNames: [...baseClassNames, classNames] }
      : { className: mx(...baseClassNames, classNames), role };

    return (
      <Root {...props} {...rootProps} data-scroll-separator='false' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Stack
// TODO(burdon): Rename Content.
//

type SharedCardStackProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  asChild?: boolean;
};

const CardStackStack = forwardRef<
  HTMLDivElement,
  Omit<StackProps, 'orientation' | 'size' | 'rail' | 'separatorOnScroll'>
>(({ children, classNames, itemsCount = 0, ...props }, forwardedRef) => {
  // NOTE: Should not have horizontal padding since separatorOnScroll should be full width.
  return (
    <Stack
      orientation='vertical'
      size='contain'
      rail={false}
      classNames={
        /* NOTE(thure): Do not let this element have zero intrinsic size, otherwise the drop indicator will not display. See #9035. */
        ['plb-2', classNames]
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

//
// Item
//

const cardStackItem = 'contain-layout pli-2 plb-1 first-of-type:pbs-0 last-of-type:pbe-0';

const CardStackItem = forwardRef<HTMLDivElement, SharedCardStackProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardStackItem, classNames] }
      : { className: mx(cardStackItem, classNames), role };

    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Heading
//

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

//
// Footer
//

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

//
// DragHandle
//

const CardStackDragHandle = Card.DragHandle;

//
// CardStack
//

export const CardStack = {
  Root: CardStackRoot,
  Content: CardStackContent,
  Stack: CardStackStack,
  Heading: CardStackHeading,
  Footer: CardStackFooter,
  DragHandle: CardStackDragHandle,
  Item: CardStackItem,
};

export { cardStackRoot, cardStackFooter, cardStackHeading, cardStackContent, cardStackItem };
