//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { SearchContextProvider } from '#hooks';
import { translations } from '#translations';

import { SearchArticle } from './SearchArticle.tsx';

random.seed(0);

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return <Loading />;
  }

  return (
    <SearchContextProvider>
      <SearchArticle role='article' space={space} attendableId={space.id} />
    </SearchContextProvider>
  );
};

const meta = {
  title: 'plugins/plugin-search/containers/SearchArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);

              const factory = createObjectFactory(defaultSpace.db, random as any);
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
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
