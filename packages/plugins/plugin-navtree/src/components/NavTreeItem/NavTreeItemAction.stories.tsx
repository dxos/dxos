//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type NodeArg } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { NavTreeItemAction, type NavTreeItemActionMenuProps } from './NavTreeItemAction';

const parent = {
  id: faker.string.uuid(),
  type: 'node',
  data: null,
  properties: {
    label: faker.lorem.words(2),
    icon: 'ph--circle--regular',
  },
} satisfies NodeArg<any>;

// TODO(burdon): Factor out across tests.
const menuActions = faker.helpers.multiple(
  () =>
    ({
      id: faker.string.uuid(),
      type: 'action',
      data: () => {
        console.log('invoke');
      },
      properties: {
        label: faker.lorem.words(2),
        icon: 'ph--circle--regular',
      },
    }) satisfies NodeArg<any>,
  { count: 20 },
);

const meta = {
  title: 'plugins/plugin-navtree/NavTreeItemAction',
  component: NavTreeItemAction,
  args: {
    icon: 'ph--list--regular',
    parent,
    menuActions,
    label: 'Select action',
  } satisfies Partial<NavTreeItemActionMenuProps>,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NavTreeItemAction>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
