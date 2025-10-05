//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo } from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';

import { MenuProvider, DropdownMenu as NaturalDropdownMenu, ToolbarMenu } from '../components';
import { useMenuActions } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import { translations } from '../translations';
import { type MenuAction } from '../types';

faker.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/ToolbarMenu',
  component: ToolbarMenu,
    parameters: {
    translations,
  },
} satisfies Meta<typeof ToolbarMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DropdownMenu: Story = {
  render: () => {
    const menuActions = useMemo(() => createActions() as MenuAction[], []);
    const resolveGroupItems = useCallback(() => menuActions, [menuActions]);
    useMutateActions(menuActions);

    return (
      <MenuProvider useGroupItems={resolveGroupItems}>
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' size={5} label='Options' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

export const Toolbar: Story = {
  render: () => {
    const nestedMenuActions = useMemo(() => createNestedActionsResolver(), []);

    return (
      <MenuProvider {...nestedMenuActions}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};

export const UseMenuActionsToolbar: Story = {
  render: () => {
    const menu = useMenuActions(createNestedActions);

    return (
      <MenuProvider {...menu}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};
