//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { PluginDetail } from './PluginDetail';

const meta = {
  title: 'plugins/plugin-registry/PluginDetail',
  component: PluginDetail,
  decorators: [withTheme],
  parameters: {
    layout: 'column',
    translations,
  },
} satisfies Meta<typeof PluginDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plugin: {
      meta: {
        id: 'example.com/plugin/test-plugin',
        name: 'Test Plugin',
        description: faker.lorem.paragraphs(2),
        icon: 'ph--bug--regular',
        homePage: 'https://example.com',
        source: 'https://github.com/example/test-plugin',
        screenshots: [
          'https://media.gcflearnfree.org/content/55e073de7dd48174331f51b3_01_17_2014/getting_started_interactive2.png',
        ],
      },
      modules: [],
    },
  },
};
