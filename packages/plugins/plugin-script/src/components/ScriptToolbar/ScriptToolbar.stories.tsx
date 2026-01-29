//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { OperationPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Script } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type ScriptToolbarState, type ScriptToolbarStateStore } from '../../hooks';
import { translations } from '../../translations';

import { ScriptToolbar } from './ScriptToolbar';

// Create a mock store for stories.
const createMockStore = (initialState: ScriptToolbarState = {}): ScriptToolbarStateStore => {
  const registry = Registry.make();
  const atom = Atom.make<ScriptToolbarState>(initialState);
  return {
    atom,
    get value() {
      return registry.get(atom);
    },
    update: (updater) => registry.set(atom, updater(registry.get(atom))),
    set: (key, value) => registry.set(atom, { ...registry.get(atom), [key]: value }),
  };
};

const meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
  decorators: [
    withTheme,
    withLayout({ classNames: 'is-prose' }),
    withPluginManager({
      plugins: [OperationPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ScriptToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: createMockStore(),
    script: Script.make({
      name: 'test',
      description: 'test',
      source: 'test',
    }),
  },
};
