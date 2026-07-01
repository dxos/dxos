//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { PluginDetail } from './PluginDetail';

const plugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.test'),
    name: 'Test Plugin',
    author: 'DXOS',
    description: random.lorem.paragraphs(2),
    icon: { key: 'ph--bug--regular', hue: 'sky' },
    homePage: 'https://example.com',
    source: 'https://github.com/example/test-plugin',
    screenshots: [
      {
        light: 'https://placehold.co/1728x990',
      },
    ],
  }),
);

const meta = {
  title: 'plugins/plugin-registry/components/PluginDetail',
  component: PluginDetail,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof PluginDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plugin: plugin.pipe(Plugin.make)(),
  },
};

export const Failure: Story = {
  args: {
    plugin: plugin.pipe(Plugin.make)(),
    failure: {
      id: 'com.example.plugin.test',
      phase: 'activation',
      reason: 'error',
      error: new Error(random.lorem.paragraph(2)),
      timestamp: Date.now(),
    },
  },
};
