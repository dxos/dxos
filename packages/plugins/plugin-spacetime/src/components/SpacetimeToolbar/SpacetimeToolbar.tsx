//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { ElevationProvider } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, MenuRootProps, useMenuActions } from '@dxos/react-ui-menu';
import { composable, composableProps } from '@dxos/ui-theme';

import { type SpacetimeTool, createToolActions } from './tools';

export type SpacetimeToolbarState = {
  tool: SpacetimeTool;
};

export type SpacetimeToolbarProps = Pick<MenuRootProps, 'alwaysActive'> & {
  tool: SpacetimeTool;
  onToolChange: (tool: SpacetimeTool) => void;
};

export const SpacetimeToolbar = composable<HTMLDivElement, SpacetimeToolbarProps>(
  ({ alwaysActive, tool, onToolChange, ...props }, forwardedRef) => {
    const menuCreator = useMemo(() => createToolbarActions({ tool, onToolChange }), [tool, onToolChange]);
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation='base'>
        <Menu.Root alwaysActive={alwaysActive} {...menuActions}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
        </Menu.Root>
      </ElevationProvider>
    );
  },
);

const createToolbarActions = ({ tool, onToolChange }: SpacetimeToolbarProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make(() => {
    const builder = MenuBuilder.make();
    builder.subgraph(createToolActions({ tool }, onToolChange));
    return builder.build();
  });
};
