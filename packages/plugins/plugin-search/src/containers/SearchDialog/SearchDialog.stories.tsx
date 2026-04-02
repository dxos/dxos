//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { corePlugins, StorybookPlugin } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Dialog } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '../../translations';

import { SearchDialog } from './SearchDialog';
import { SearchContextProvider } from '../../hooks';

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
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              const factory = createObjectFactory(space.db, faker as any);
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
    translations,
  },
} satisfies Meta<typeof SearchDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pivotId: 'storybook',
  },
};
