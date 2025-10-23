//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createNotebook } from '../../testing';
import { translations } from '../../translations';

import { NotebookStack } from './NotebookStack';

const meta = {
  title: 'plugins/plugin-script/NotebookStack',
  component: NotebookStack,
  decorators: [
    withTheme,
    withLayout({ container: 'column', classNames: 'is-prose' }),
    // TODO(burdon): Factor out Surface to avoid dependency on app-framework.
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof NotebookStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notebook: createNotebook(),
  },
};
