//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import React from 'react';

import { type ActionExecutor, type ActionGraphProps, Menu, useMenuActions } from '@dxos/react-ui-menu';
import { type ThemedClassName } from '@dxos/react-ui';

const NAVBAR_NAME = 'SimpleLayout.NavBar';

export type NavBarProps = ThemedClassName<{
  /** Action graph atom for the toolbar. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction?: ActionExecutor;
}>;

/**
 * Presentational navbar component that renders a toolbar from an action graph.
 */
export const NavBar = ({ classNames, actions, onAction }: NavBarProps) => {
  const menu = useMenuActions(actions);

  return (
    <Menu.Root {...menu} alwaysActive onAction={onAction}>
      <Menu.Toolbar density='coarse' />
    </Menu.Root>
  );
};

NavBar.displayName = NAVBAR_NAME;
