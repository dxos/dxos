//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composable, composableProps } from '@dxos/react-ui';

/**
 * Standard centered empty-state layout for "initialize / connect this thing"
 * panels. Used by `InitializeMailbox` and `InitializeCalendar` so they
 * share consistent insets and spacing.
 */
export const InitializeEmpty = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })} ref={forwardedRef}>
    {children}
  </div>
));

InitializeEmpty.displayName = 'InitializeEmpty';
