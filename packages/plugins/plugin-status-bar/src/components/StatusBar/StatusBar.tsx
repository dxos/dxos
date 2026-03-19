//
// Copyright 2024 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { IconButton, Tooltip, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Item
//

type StatusBarItemProps = ThemedClassName<PropsWithChildren>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <div {...props} role='status' className={mx('grid place-items-center', classNames)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

//
// Text
//

//
// Item
//

type StatusBarItemProps = ThemedClassName<PropsWithChildren>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <div {...props} role='status' className={mx('grid place-items-center', classNames)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

//
// Text
//

type StatusBarTextProps = ThemedClassName<{ children: ReactNode }>;

const StatusBarText = forwardRef<HTMLSpanElement, StatusBarTextProps>(({ classNames, children }, forwardedRef) => (
  <span className={mx(classNames)} ref={forwardedRef}>
    {children}
  </span>
));

//
// Button
//

type StatusBarButtonProps = ThemedClassName<ComponentPropsWithRef<'button'> & { asChild?: boolean }>;

/**
 * @deprecated
 */
const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(
  ({ classNames, children, asChild, ...props }, forwardedRef) => {
    const classes = mx(
      'flex items-center justify-center gap-2 p-1 px-2 rounded-xs',
      'select-none cursor-pointer dx-focus-ring text-description text-xs',
      'hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600',
      classNames,
    );

    return asChild ? (
      <Slot role='button' ref={forwardedRef} className={classes} {...props}>
        {children}
      </Slot>
    ) : (
      <button className={classes} ref={forwardedRef} {...props}>
        {children}
      </button>
    );
  },
);

//
// Content
//

type StartContentProps = ThemedClassName<PropsWithChildren<{}>>;

const StartContent = forwardRef<HTMLDivElement, StartContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center space-x-2', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

//
// EndContent
//

type EndContentProps = ThemedClassName<PropsWithChildren<{}>>;

const EndContent = forwardRef<HTMLDivElement, EndContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center justify-end', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

//
// StatusBar
//

export const StatusBar = {
  Item: StatusBarItem,
  Text: StatusBarText,
  Button: StatusBarButton,
  StartContent,
  EndContent,
};
