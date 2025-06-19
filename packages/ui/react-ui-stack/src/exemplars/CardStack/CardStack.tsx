//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, type PropsWithChildren } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { railGridHorizontalContainFitContent, Stack, type StackProps } from '../../components';
import { Card } from '../Card';

const cardStackContainer = 'flex flex-col pli-2 plb-2';

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
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Stack>
  );
});

const CardStackDragHandle = Card.DragHandle;

const cardStackHeading = 'mli-2 order-first bg-transparent rounded-bs-md flex items-center';

const CardStackHeading = forwardRef<HTMLDivElement, PropsWithChildren<{}>>(({ children }, forwardedRef) => {
  return (
    <div role='heading' className={cardStackHeading} ref={forwardedRef}>
      {children}
    </div>
  );
});

const cardStackFooter =
  'plb-2 mli-2 border-bs border-transparent [[data-scroll-separator-end="true"]_&]:border-subduedSeparator';

const CardStackFooter = forwardRef<HTMLDivElement, PropsWithChildren<{}>>(({ children }, forwardedRef) => {
  return (
    <div role='none' className={cardStackFooter} ref={forwardedRef}>
      {children}
    </div>
  );
});

const cardStackRoot = mx(
  'shrink min-bs-0 bg-baseSurface border border-separator rounded-md grid dx-focus-ring-group-x-indicator kanban-drop',
  railGridHorizontalContainFitContent,
);

const CardStackRoot = forwardRef<HTMLDivElement, PropsWithChildren<{}>>(({ children }, forwardedRef) => {
  return (
    <div role='none' className={cardStackRoot} data-scroll-separator='false' ref={forwardedRef}>
      {children}
    </div>
  );
});

export const CardStack = {
  Root: CardStackRoot,
  Stack: CardStackStack,
  Heading: CardStackHeading,
  Footer: CardStackFooter,
  DragHandle: CardStackDragHandle,
};

export { cardStackRoot, cardStackFooter, cardStackHeading, cardStackContainer };
