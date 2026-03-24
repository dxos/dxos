//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { View } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Filter, useObject, useQuery, useSpaces } from '@dxos/react-client/echo';
import { ViewModel } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization } from '@dxos/types';

import { Masonry } from '../../types';

import { MasonryContainer } from './MasonryContainer';

faker.seed(0);

const StorybookMasonry = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const masonries = useQuery(space?.db, Filter.type(Masonry.Masonry));
  const [masonry] = useObject(masonries.at(0));

  return masonry ? <MasonryContainer view={masonry.view} role='story' /> : null;
};

const meta = {
  title: 'plugins/plugin-masonry/containers/Masonry',
  component: StorybookMasonry,
  render: () => <StorybookMasonry />,
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [Organization.Organization, View.View, Masonry.Masonry],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const { view } = yield* Effect.promise(() =>
                ViewModel.makeFromDatabase({
                  db: space.db,
                  typename: Organization.Organization.typename,
                }),
              );
              const masonry = Masonry.make({ view });
              space.db.add(masonry);
              const factory = createObjectFactory(space.db, faker as any);
              yield* Effect.promise(() => factory([{ type: Organization.Organization, count: 64 }]));
            }),
        }),

        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
