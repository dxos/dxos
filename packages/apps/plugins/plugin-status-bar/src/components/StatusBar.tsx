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
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        role='button'
        className={mx(
          'flex items-center gap-2 p-1 px-2 rounded-sm select-none hover:bg-gray-200 cursor-pointer active:bg-gray-300',
          classNames,
        )}
        ref={forwardedRef}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

export default StatusBarButton;

type StatusBarItemProps = ThemedClassName<{ children: ReactNode }>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(({ classNames, children }, forwardedRef) => (
  <div
    role='menuitem'
    className={mx('flex items-center gap-2 p-1 px-2 rounded-sm select-none', classNames)}
    ref={forwardedRef}
  >
    {children}
  </div>
));
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
          'flex justify-end items-center gap-2 border-solid border-t border-gray-200 bg-gray-50 text-gray-500',
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

const StartContent = forwardRef<HTMLDivElement, StartContentProps>(({ classNames, children }, forwardedRef) => {
  const groupAttrs = useArrowNavigationGroup({ axis: 'horizontal' });

  return (
    <div
      role='none'
      className={mx('flex-grow flex items-center space-x-2', classNames)}
      ref={forwardedRef}
      {...groupAttrs}
    >
      {children}
    </div>
  );
});

type EndContentProps = ThemedClassName<{ children: ReactNode }>;

const EndContent = forwardRef<HTMLDivElement, EndContentProps>(({ classNames, children }, forwardedRef) => {
  const groupAttrs = useArrowNavigationGroup({ axis: 'horizontal' });
  return (
    <div
      role='none'
      className={mx('flex-grow flex items-center justify-end', classNames)}
      ref={forwardedRef}
      {...groupAttrs}
    >
      {children}
    </div>
  );
});

export const StatusBar = {
  Container: StatusBarContainer,
  Text: StatusBarText,
  Item: StatusBarItem,
  Button: StatusBarButton,
  StartContent,
  EndContent,
};
