//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ClientPlugin } from '../ClientPlugin';
import { translations } from '../translations';

import { RecoveryCredentialsContainer } from './RecoveryCredentialsContainer';

const meta = {
  title: 'plugins/plugin-client/RecoveryCredentialsContainer',
  component: RecoveryCredentialsContainer,
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
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RecoveryCredentialsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
