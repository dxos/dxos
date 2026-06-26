//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '#translations';

import { MenuBuilder } from '../builder';
import { Menu } from '../components';
import { type ActionGraphProps, useMenuActions, useMenuBuilder } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';

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

/**
 * Reactive toolbar driven by an atom-backed actions hook.
 *
 * Defining actions inside a hook lets them subscribe to reactive state
 * (echo, atoms, settings) without re-rendering the toolbar shell.
 * The menu structure is data, not JSX.
 *
 * @idiom org.dxos.react-ui-menu.toolbarMenu
 *   applies: Toolbars whose entries depend on reactive state
 *   instead-of: Hand-wired children inside a bespoke `Toolbar.Root`
 *   uses: {@link useMenuActions}, {@link Menu.Root}, {@link Menu.Toolbar}
 */
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

/**
 * Toolbar with both labeled and tooltip-only (iconOnly) Input.Switch items.
 */
export const SwitchToolbar: Story = {
  render: () => {
    const [wordWrap, setWordWrap] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(true);

    const menuActions = useMenuBuilder(
      () =>
        MenuBuilder.make()
          .root({ label: 'Editor settings' })
          .switch('word-wrap', { label: 'Word wrap', checked: wordWrap }, () => setWordWrap((v) => !v))
          .switch('line-numbers', { label: 'Line numbers', iconOnly: true, checked: lineNumbers }, () =>
            setLineNumbers((v) => !v),
          )
          .build(),
      [wordWrap, lineNumbers],
    );

    return (
      <Menu.Root {...menuActions} alwaysActive>
        <Menu.Toolbar />
      </Menu.Root>
    );
  },
};
