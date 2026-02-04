//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionExecutor,
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

const NAVBAR_NAME = 'SimpleLayout.NavBar';

export type NavBarProps = ThemedClassName<{
  /** Attendable ID to apply attended styles. */
  attendableId?: string;
  /** Action graph atom for the toolbar. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction?: ActionExecutor;
}>;

/**
 * Presentational navbar component that renders a toolbar from an action graph.
 */
export const NavBar = ({ classNames, attendableId, actions, onAction }: NavBarProps) => {
  const menu = useMenuActions(actions);

  return (
    <MenuProvider {...menu} onAction={onAction} attendableId={attendableId}>
      <ToolbarMenu classNames={mx('justify-center', classNames)} />
    </MenuProvider>
  );
};

NavBar.displayName = NAVBAR_NAME;
