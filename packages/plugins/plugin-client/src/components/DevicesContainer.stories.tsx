//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '../ClientPlugin';
import { translations } from '../translations';

import { DevicesContainer } from './DevicesContainer';

const meta = {
  title: 'plugins/plugin-client/DevicesContainer',
  component: DevicesContainer,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        IntentPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof DevicesContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    createInvitationUrl: () => 'https://example.com',
  },
};
