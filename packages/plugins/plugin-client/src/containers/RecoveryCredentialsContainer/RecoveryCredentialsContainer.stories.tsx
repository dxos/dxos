//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '../../ClientPlugin';
import { initializeIdentity } from '../../testing';
import { translations } from '../../translations';

import { RecoveryCredentialsContainer } from './RecoveryCredentialsContainer';

const meta = {
  title: 'plugins/plugin-client/containers/RecoveryCredentialsContainer',
  component: RecoveryCredentialsContainer,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        OperationPlugin(),
        RuntimePlugin(),
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
