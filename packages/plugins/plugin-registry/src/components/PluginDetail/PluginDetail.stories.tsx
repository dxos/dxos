//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { PluginDetail } from './PluginDetail.tsx';

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
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    // `useLayout` (mobile-aware gutter sizing) needs a PluginManager providing AppCapabilities.Layout.
    withPluginManager({ plugins: [...corePlugins(), StorybookPlugin.make({})] }),
  ],
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
