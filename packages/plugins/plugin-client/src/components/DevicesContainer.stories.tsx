//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { osTranslations } from '@dxos/shell/react';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { DevicesContainer } from './DevicesContainer';
import { ClientPlugin } from '../ClientPlugin';
import translations from '../translations';

const meta: Meta = {
  title: 'plugins/plugin-client/DevicesContainer',
  component: DevicesContainer,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
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
    translations: [...translations, osTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof DevicesContainer>;

export const Default: Story = {
  args: {
    createInvitationUrl: () => 'https://example.com',
  },
};
