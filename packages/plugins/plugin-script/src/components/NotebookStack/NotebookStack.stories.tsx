//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createNotebook } from '../../testing';
import { translations } from '../../translations';

import { NotebookStack } from './NotebookStack';

const meta = {
  title: 'plugins/plugin-script/NotebookStack',
  component: NotebookStack,
  decorators: [
    withTheme,
    withLayout({ layout: 'column', classNames: 'is-prose' }),
    // TODO(burdon): Factor out Surface to avoid dependency on app-framework.
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
          },
        }),
        ...corePlugins(),
        SpacePlugin({}),
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
