//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '#plugin';
import { initializeIdentity } from '#testing';
import { translations } from '#translations';

import { InvitationsContainer } from './InvitationsContainer.tsx';

const meta = {
  title: 'plugins/plugin-client/containers/InvitationsContainer',
  component: InvitationsContainer,
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
        ProcessManagerPlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof InvitationsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
