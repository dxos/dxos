//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization } from '@dxos/types';

import { Masonry } from '../types';

import { MasonryContainer } from './MasonryContainer';

faker.seed(0);

const StorybookMasonry = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const masonries = useQuery(space?.db, Filter.type(Masonry.Masonry));
  const masonry = masonries.at(0);
  const view = masonry?.view.target;

  return view ? <MasonryContainer view={view} role='story' /> : null;
};

const meta = {
  title: 'plugins/plugin-masonry/Masonry',
  component: StorybookMasonry,
  render: () => <StorybookMasonry />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Organization.Organization, View.View, Masonry.Masonry],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              const { view } = yield* Effect.promise(() =>
                View.makeFromDatabase({
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
        ...corePlugins(),
        SpacePlugin({}),
        PreviewPlugin(),
        StorybookPlugin({}),
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
