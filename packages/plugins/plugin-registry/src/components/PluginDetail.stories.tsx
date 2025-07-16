//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { PluginDetail, type PluginDetailProps } from './PluginDetail';
import { translations } from '../translations';

const meta: Meta<PluginDetailProps> = {
  title: 'plugins/plugin-registry/PluginDetail',
  component: PluginDetail,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<PluginDetailProps>;

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
