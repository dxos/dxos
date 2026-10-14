//
// Copyright 2024 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

//
// Item
//

type StatusBarItemProps = Util.ThemedClassName<PropsWithChildren>;

const StatusBarItem = forwardRef<HTMLDivElement, StatusBarItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <Layout.Grid {...props} role='status' center classNames={classNames} ref={forwardedRef}>
        {children}
      </Layout.Grid>
    );
  },
);

//
// Text
//

type StatusBarTextProps = Util.ThemedClassName<{ children: ReactNode }>;

const StatusBarText = forwardRef<HTMLSpanElement, StatusBarTextProps>(({ classNames, children }, forwardedRef) => (
  <span className={mx(classNames)} ref={forwardedRef}>
    {children}
  </span>
));

//
// Button
//

type StatusBarButtonProps = Util.ThemedClassName<ComponentPropsWithRef<'button'> & { asChild?: boolean }>;

/**
 * @deprecated
 */
const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(
  ({ classNames, children, asChild, ...props }, forwardedRef) => {
    const classes = mx(
      'flex items-center justify-center gap-2 p-1 px-2 rounded-xs',
      'select-none cursor-pointer dx-focus-ring text-fg-muted text-xs',
      'hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600',
      classNames,
    );

    return (
      <ark.button
        asChild={asChild}
        {...(asChild && { role: 'button' })}
        className={classes}
        ref={forwardedRef}
        {...props}
      >
        {children}
      </ark.button>
    );
  },
);

//
// Content
//

type StartContentProps = Util.ThemedClassName<PropsWithChildren<{}>>;

const StartContent = forwardRef<HTMLDivElement, StartContentProps>(({ classNames, children }, forwardedRef) => (
  <Layout.Flex align='center' classNames={['flex-grow space-x-2', classNames]} ref={forwardedRef}>
    {children}
  </Layout.Flex>
));

//
// EndContent
//

type EndContentProps = Util.ThemedClassName<PropsWithChildren<{}>>;

const EndContent = forwardRef<HTMLDivElement, EndContentProps>(({ classNames, children }, forwardedRef) => (
  <Layout.Flex align='center' justify='end' classNames={['flex-grow', classNames]} ref={forwardedRef}>
    {children}
  </Layout.Flex>
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
