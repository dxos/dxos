//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { initializeIdentity } from '#testing';
import { translations } from '#translations';

import { ClientPlugin } from '../../ClientPlugin';
import { AccountContainer } from './AccountContainer';

const meta = {
  title: 'plugins/plugin-client/containers/AccountContainer',
  component: AccountContainer,
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
        ProcessManagerPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AccountContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
