//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { HelpMenu } from './HelpMenu';

const DefaultStory = () => (
  <StatusBar.EndContent>
    <HelpMenu />
  </StatusBar.EndContent>
);

const makeConfig = (build?: { version?: string; timestamp?: string }) =>
  new Config({
    version: 1,
    runtime: {
      app: {
        build,
      },
    },
  });

const meta = {
  title: 'plugins/plugin-support/containers/HelpMenu',
  component: HelpMenu,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' }), withPluginManager({ plugins: corePlugins() })],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof HelpMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    withClientProvider({
      config: makeConfig({
        version: '0.8.3-beta.b78990fdd5',
        timestamp: new Date(Date.now() - Math.random() * 24 * 3600 * 1000).toISOString(),
      }),
    }),
  ],
};
