//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { RecoveryCredentialsContainer } from './RecoveryCredentialsContainer';
import { ClientPlugin } from '../ClientPlugin';
import translations from '../translations';

const meta: Meta = {
  title: 'plugins/plugin-client/RecoveryCredentialsContainer',
  component: RecoveryCredentialsContainer,
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
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof RecoveryCredentialsContainer>;

export const Default: Story = {};
