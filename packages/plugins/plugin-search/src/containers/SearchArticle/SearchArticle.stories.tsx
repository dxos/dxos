//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { corePlugins, StorybookPlugin } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { SearchContextProvider } from '../../hooks';
import { translations } from '../../translations';

import { SearchArticle } from './SearchArticle';

faker.seed(0);

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return (
    <SearchContextProvider>
      <SearchArticle space={space} />
    </SearchContextProvider>
  );
};

const meta = {
  title: 'plugins/plugin-search/containers/SearchArticle',
  component: SearchArticle,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
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
} satisfies Meta<typeof SearchArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
