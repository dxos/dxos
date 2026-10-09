//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import React from 'react';

import { type ActionExecutor, type ActionGraphProps, ActionToolbar, useMenuActions } from '@dxos/react-ui-menu';
import * as Util from '@dxos/react-ui/Util';

const NAVBAR_NAME = 'MobileLayout.NavBar';

export type MobileNavBarProps = {
  /** Action graph atom for the toolbar. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction?: ActionExecutor;
};

/**
 * Presentational navbar component that renders a toolbar from an action graph.
 */
export const MobileNavBar = Util.composable<HTMLDivElement, MobileNavBarProps>(
  ({ actions, onAction, ...props }, forwardedRef) => {
    const menuActions = useMenuActions(actions);

    return (
      <ActionToolbar
        {...menuActions}
        alwaysActive
        onAction={onAction}
        {...Util.composableProps(props)}
        ref={forwardedRef}
      />
    );
  },
);

MobileNavBar.displayName = NAVBAR_NAME;
