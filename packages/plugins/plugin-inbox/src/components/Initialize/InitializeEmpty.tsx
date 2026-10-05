//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Util from '@dxos/react-ui/Util';

/**
 * Standard centered empty-state layout for "initialize / connect this thing" panels.
 * Used by `InitializeMailbox` and `InitializeCalendar` so they share consistent insets and spacing.
 */
export const InitializeEmpty = Util.composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  <div {...Util.composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })} ref={forwardedRef}>
    {children}
  </div>
));

InitializeEmpty.displayName = 'InitializeEmpty';
