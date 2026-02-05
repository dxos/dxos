//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { OperationPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '../ClientPlugin';
import { translations } from '../translations';

import { RecoveryCredentialsContainer } from './RecoveryCredentialsContainer';

const meta = {
  title: 'plugins/plugin-client/RecoveryCredentialsContainer',
  component: RecoveryCredentialsContainer,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
            }),
        }),
        OperationPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RecoveryCredentialsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
