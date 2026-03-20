//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import React, { forwardRef } from 'react';

import { ComposableProps } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, Menu, useMenuActions } from '@dxos/react-ui-menu';
import { composableProps } from '@dxos/ui-theme';

const NAVBAR_NAME = 'SimpleLayout.NavBar';

export type NavBarProps = ComposableProps<
  HTMLDivElement,
  {
    /** Action graph atom for the toolbar. */
    actions: Atom.Atom<ActionGraphProps>;
    /** Action executor callback. */
    onAction?: ActionExecutor;
  }
>;

/**
 * Presentational navbar component that renders a toolbar from an action graph.
 */
export const NavBar = forwardRef<HTMLDivElement, NavBarProps>(({ actions, onAction, ...props }, forwardedRef) => {
  const menuActions = useMenuActions(actions);

  return (
    <Menu.Root {...menuActions} alwaysActive onAction={onAction}>
      <Menu.Toolbar {...composableProps(props)} density='coarse' ref={forwardedRef} />
    </Menu.Root>
  );
});

NavBar.displayName = NAVBAR_NAME;
