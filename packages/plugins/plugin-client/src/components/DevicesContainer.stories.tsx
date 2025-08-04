//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ClientPlugin } from '../ClientPlugin';
import { translations } from '../translations';

import { DevicesContainer } from './DevicesContainer';

const meta: Meta = {
  title: 'plugins/plugin-client/DevicesContainer',
  component: DevicesContainer,
  decorators: [
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
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof DevicesContainer>;

export const Default: Story = {
  args: {
    createInvitationUrl: () => 'https://example.com',
  },
};
