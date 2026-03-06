//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { Menu } from '../components';
import { type ActionGraphProps, useMenuActions } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import { translations } from '../translations';

faker.seed(1234);

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
    const actionsAtom = useMemo(() => {
      const actions = createActions();
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id, relation: 'child' })),
      }).pipe(Atom.keepAlive);
    }, []);
    useMutateActions(actionsAtom);
    const menu = useMenuActions(actionsAtom);

    return (
      <Menu.Root {...menu}>
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
    const nestedMenuActions = useMemo(() => createNestedActionsResolver(), []);

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
    const menu = useMenuActions(createNestedActions);

    return (
      <Menu.Root {...menu}>
        <Menu.Toolbar />
      </Menu.Root>
    );
  },
};
