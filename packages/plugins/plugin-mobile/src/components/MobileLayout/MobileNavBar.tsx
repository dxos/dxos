//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import React from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import { ActionToolbar, type ActionExecutor, type ActionGraphProps, useMenuActions } from '@dxos/react-ui-menu';

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
export const MobileNavBar = composable<HTMLDivElement, MobileNavBarProps>(
  ({ actions, onAction, ...props }, forwardedRef) => {
    const menuActions = useMenuActions(actions);

    return (
      <ActionToolbar {...menuActions} alwaysActive onAction={onAction} {...composableProps(props)} ref={forwardedRef} />
    );
  },
);

MobileNavBar.displayName = NAVBAR_NAME;
