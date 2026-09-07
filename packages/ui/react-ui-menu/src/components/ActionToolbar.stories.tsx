//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useContext, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '#translations';

import { MenuBuilder } from '../builder';
import { type ActionGraphProps, useMenuActions, useMenuBuilder } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import { ActionMenu } from './ActionMenu';
import { ActionToolbar } from './ActionToolbar';

random.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/ActionToolbar',
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

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
    const menu = useMenuActions(actions);

    return (
      <ActionMenu {...menu}>
        <IconButton icon='ph--list-checks--regular' label='Options' />
      </ActionMenu>
    );
  },
};

export const Default: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return <ActionToolbar {...menu} alwaysActive />;
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
 *   uses: {@link useMenuActions}, {@link ActionToolbar}
 */
export const UseMenuActionsToolbar: Story = {
  render: () => {
    useMutateActions(createNestedActions);
    const menu = useMenuActions(createNestedActions);

    return <ActionToolbar {...menu} alwaysActive />;
  },
};

/**
 * Toolbar with both labeled and tooltip-only (iconOnly) Input.Switch items.
 */
export const SwitchToolbar: Story = {
  render: () => {
    const [wordWrap, setWordWrap] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(true);

    const menu = useMenuBuilder(
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

    return <ActionToolbar {...menu} alwaysActive />;
  },
};

/**
 * `ActionToolbar` renders its own children after the graph items — here a growing filter input
 * trails the actions.
 */
export const TrailingChildren: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <ActionToolbar {...menu} alwaysActive>
        <Input.Root>
          <Input.TextInput variant='subdued' placeholder='Filter…' classNames='grow min-w-40' />
        </Input.Root>
      </ActionToolbar>
    );
  },
};

/**
 * The other way round: a hand-written `Toolbar.Root` with an `ActionMenu` among its own controls.
 */
export const EmbeddedMenu: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <Toolbar.Root>
        <Toolbar.Button>Foo</Toolbar.Button>
        <Toolbar.Separator />
        <ActionMenu {...menu}>
          <Toolbar.IconButton icon='ph--dots-three-vertical--regular' label='More' />
        </ActionMenu>
      </Toolbar.Root>
    );
  },
};
