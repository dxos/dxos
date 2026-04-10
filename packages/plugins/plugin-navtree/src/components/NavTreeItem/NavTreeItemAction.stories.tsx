//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { type Node } from '@dxos/app-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';

import { NavTreeItemAction, type NavTreeItemActionMenuProps } from './NavTreeItemAction';

const parent = {
  id: random.string.uuid(),
  type: 'node',
  data: null,
  properties: {
    label: random.lorem.words(2),
    icon: 'ph--circle--regular',
  },
} satisfies Node.NodeArg<any>;

// TODO(burdon): Factor out across tests.
const menuActions = random.helpers.multiple(
  () =>
    ({
      id: random.string.uuid(),
      type: 'action',
      data: () =>
        Effect.sync(() => {
          console.log('invoke');
        }),
      properties: {
        label: random.lorem.words(2),
        icon: 'ph--circle--regular',
      },
    }) satisfies Node.NodeArg<any>,
  { count: 20 },
);

const meta = {
  title: 'plugins/plugin-navtree/components/NavTreeItemAction',
  component: NavTreeItemAction,
  args: {
    icon: 'ph--list--regular',
    parent,
    menuActions,
    label: 'Select action',
  } satisfies Partial<NavTreeItemActionMenuProps>,
  decorators: [
    withPluginManager({
      plugins: [...corePlugins(), RuntimePlugin()],
    }),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NavTreeItemAction>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
