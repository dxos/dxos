//
// Copyright 2024 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

type StatusBarTextProps = ThemedClassName<{ children: ReactNode }>;

const StatusBarText = forwardRef<HTMLSpanElement, StatusBarTextProps>(({ classNames, children }, forwardedRef) => (
  <span className={mx(classNames)} ref={forwardedRef}>
    {children}
  </span>
));

type StatusBarButtonProps = ThemedClassName<ComponentPropsWithRef<'button'> & { asChild?: boolean }>;

const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(
  ({ classNames, children, asChild, ...props }, forwardedRef) => {
    const classes = mx(
      'flex items-center justify-center gap-2 p-1 pli-2 rounded-sm',
      'select-none cursor-pointer dx-focus-ring text-description text-xs',
      'hover:bg-neutral-75 active:bg-neutral-150 dark:hover:bg-neutral-750 dark:active:bg-neutral-700',
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

export default StatusBarButton;

type StatusBarItemProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <div
      role='menuitem'
      className={mx('flex items-center justify-center gap-2 p-1 pli-2 rounded-sm select-none', classNames)}
      ref={forwardedRef}
      {...props}
    >
      {children}
    </div>
  ),
);

type StartContentProps = ThemedClassName<PropsWithChildren<{}>>;

const StartContent = forwardRef<HTMLDivElement, StartContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center space-x-2', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

type EndContentProps = ThemedClassName<PropsWithChildren<{}>>;

const EndContent = forwardRef<HTMLDivElement, EndContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center justify-end', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

export const StatusBar = {
  Text: StatusBarText,
  Item: StatusBarItem,
  Button: StatusBarButton,
  StartContent,
  EndContent,
};
