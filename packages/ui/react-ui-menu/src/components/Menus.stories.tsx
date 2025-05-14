//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';
import React, { useCallback, useMemo } from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { DropdownMenu as NaturalDropdownMenu, ToolbarMenu, MenuProvider } from '../components';
import { useMenuActions } from '../hooks/useMenuActions';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import translations from '../translations';
import { type MenuAction } from '../types';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/Menus',
  component: ToolbarMenu,
  decorators: [withTheme, withLayout({ tooltips: true }), withSignals],
  parameters: { translations },
};

export const DropdownMenu = {
  render: () => {
    const menuActions = useMemo(() => createActions() as MenuAction[], []);
    const resolveGroupItems = useCallback(() => menuActions, [menuActions]);
    useMutateActions(menuActions);

    return (
      <MenuProvider resolveGroupItems={resolveGroupItems}>
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' size={5} label='Options' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

export const Toolbar = {
  render: () => {
    const nestedMenuActions = useMemo(() => createNestedActionsResolver(), []);

    return (
      <MenuProvider {...nestedMenuActions}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};

export const UseMenuActionsToolbar = {
  render: () => {
    const menu = useMenuActions(createNestedActions);

    return (
      <MenuProvider {...menu}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};
