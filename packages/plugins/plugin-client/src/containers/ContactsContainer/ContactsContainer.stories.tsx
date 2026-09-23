//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as shellTranslations } from '@dxos/shell/react';

import { ClientPlugin } from '#plugin';
import { createFakeContacts, initializeIdentity } from '#testing';
import { translations } from '#translations';

import { ContactsContainer } from './ContactsContainer.tsx';

const meta = {
  title: 'plugins/plugin-client/containers/ContactsContainer',
  component: ContactsContainer,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client, { displayName: 'Me' });
              yield* createFakeContacts(client);
            }),
        }),
        ProcessManagerPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof ContactsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
