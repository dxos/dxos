//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';

/**
 * Standard centered empty-state layout for "initialize / connect this thing" panels.
 * Used by `InitializeMailbox` and `InitializeCalendar` so they share consistent insets and spacing.
 */
export const InitializeEmpty = Util.composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  <Layout.Flex
    column
    align='center'
    gap='lg'
    {...Util.composableProps(props, { classNames: 'p-8' })}
    ref={forwardedRef}
  >
    {children}
  </Layout.Flex>
));

InitializeEmpty.displayName = 'InitializeEmpty';
