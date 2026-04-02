//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins, StorybookPlugin } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Dialog } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { SearchContextProvider } from '../../hooks';
import { translations } from '../../translations';

import { SearchDialog } from './SearchDialog';

faker.seed(0);

const DefaultStory = () => (
  <SearchContextProvider>
    <Dialog.Root defaultOpen>
      <Dialog.Overlay>
        <SearchDialog pivotId='storybook' />
      </Dialog.Overlay>
    </Dialog.Root>
  </SearchContextProvider>
);

const meta = {
  title: 'plugins/plugin-search/containers/SearchDialog',
  component: SearchDialog,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        SpacePlugin({}),
        ClientPlugin({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              const factory = createObjectFactory(personalSpace.db, faker as any);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 10 },
                  { type: Person.Person, count: 50 },
                ]),
              );
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SearchDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pivotId: 'storybook',
  },
};
