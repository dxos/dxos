//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo } from 'react';

import { random } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { Menu } from '../components';
import { type ActionGraphProps, useMenuActions } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import { translations } from '../translations';

random.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/ToolbarMenu',
  component: Menu.Toolbar,
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta<typeof Menu.Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DropdownMenu: Story = {
  render: () => {
    const actions = useMemo(() => {
      const actions = createActions();
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id, relation: 'child' })),
      }).pipe(Atom.keepAlive);
    }, []);

    useMutateActions(actions);
    const menuActions = useMenuActions(actions);

    return (
      <Menu.Root {...menuActions}>
        <Menu.Trigger asChild>
          <IconButton icon='ph--list-checks--regular' label='Options' />
        </Menu.Trigger>
        <Menu.Content />
      </Menu.Root>
    );
  },
};

export const Toolbar: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const nestedMenuActions = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <Menu.Root {...nestedMenuActions}>
        <Menu.Toolbar />
      </Menu.Root>
    );
  },
};

export const UseMenuActionsToolbar: Story = {
  render: () => {
    useMutateActions(createNestedActions);
    const menuActions = useMenuActions(createNestedActions);

    return (
      <Menu.Root {...menuActions}>
        <Menu.Toolbar />
      </Menu.Root>
    );
  },
};
