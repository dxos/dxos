//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { CommercePlugin } from '#plugin';
import { Provider } from '#types';

import { makeSampleProvider } from '../../testing.ts';
import { translations } from '../../translations.ts';
import { ProviderArticle } from './ProviderArticle.tsx';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const providers = useQuery(space?.db, Filter.type(Provider.Provider));
  const provider = providers[0];
  if (!provider) {
    return <Loading />;
  }
  return <ProviderArticle role='article' subject={provider} attendableId='story' />;
};

const seedSpace = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => space.waitUntilReady());
    space.db.add(makeSampleProvider());
    yield* Effect.promise(() => space.db.flush());
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-commerce/ProviderArticle',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Provider.Provider],
          onClientInitialized: seedSpace,
        }),
        SpacePlugin({}),
        StorybookPlugin.make({}),
        CommercePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
