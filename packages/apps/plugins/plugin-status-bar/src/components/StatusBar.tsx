//
// Copyright 2024 DXOS.org
//
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type StatusBarTextProps = ThemedClassName<{ children: ReactNode }>;

const StatusBarText = forwardRef<HTMLSpanElement, StatusBarTextProps>(({ classNames, children }, forwardedRef) => (
  <span className={mx(classNames)} ref={forwardedRef}>
    {children}
  </span>
));

type StatusBarButtonProps = ThemedClassName<{ children: ReactNode; asChild?: boolean }> &
  React.HTMLAttributes<HTMLButtonElement>;

const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(
  ({ classNames, children, asChild, ...props }, forwardedRef) => {
    const classes = mx(
      classNames,
      'flex items-center gap-2 p-1 px-2 rounded-sm',
      'select-none cursor-pointer',
      'hover:bg-neutral-75 active:bg-neutral-150',
      'dark:hover:bg-neutral-750 dark:active:bg-neutral-700',
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

type StatusBarItemProps = ThemedClassName<{ children: ReactNode }> & React.HTMLAttributes<HTMLDivElement>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <div
      role='menuitem'
      className={mx('flex items-center gap-2 p-1 px-2 rounded-sm select-none', classNames)}
      ref={forwardedRef}
      {...props}
    >
      {children}
    </div>
  ),
);
type StatusBarContainerProps = ThemedClassName<{ children: ReactNode }>;

// TODO(zan): tabable group with tabster
const StatusBarContainer = forwardRef<HTMLDivElement, StatusBarContainerProps>(
  ({ classNames, children }, forwardedRef) => {
    const groupAttrs = useArrowNavigationGroup({ axis: 'horizontal' });
    return (
      <div
        {...groupAttrs}
        className={mx(
          'bs-[--statusbar-size]',
          'flex justify-end items-center gap-2',
          'surface-base fg-description',
          'border-bs separator-separator',
          'text-lg pointer-fine:text-xs',
          classNames,
        )}
        ref={forwardedRef}
        role='menubar'
      >
        {children}
      </div>
    );
  },
);

type StartContentProps = ThemedClassName<{ children: ReactNode }>;

const StartContent = forwardRef<HTMLDivElement, StartContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center space-x-2', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

type EndContentProps = ThemedClassName<{ children: ReactNode }>;

const EndContent = forwardRef<HTMLDivElement, EndContentProps>(({ classNames, children }, forwardedRef) => (
  <div role='none' className={mx('flex-grow flex items-center justify-end', classNames)} ref={forwardedRef}>
    {children}
  </div>
));

export const StatusBar = {
  Container: StatusBarContainer,
  Text: StatusBarText,
  Item: StatusBarItem,
  Button: StatusBarButton,
  StartContent,
  EndContent,
};
