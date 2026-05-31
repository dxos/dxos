//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { createFeedServiceLayer } from '@dxos/client/echo';
import { Feed, Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { ProductSearchPlugin } from '../../plugin';
import { makeSampleProvider, makeSampleResults, makeSampleSearch } from '../../testing';
import { translations } from '../../translations';
import { Provider, Result, Search } from '../../types';
import { SearchArticle } from './SearchArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const searches = useQuery(space?.db, Filter.type(Search.Search));
  const search = searches[0];
  if (!search) {
    return <Loading />;
  }

  return <SearchArticle role='article' subject={search} attendableId='story' />;
};

const seedSpace = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => space.waitUntilReady());

    const provider = space.db.add(makeSampleProvider());
    const search = space.db.add(makeSampleSearch(provider));
    yield* Effect.promise(() => space.db.flush());

    // Results are immutable feed entries.
    const feed = search.feed?.target;
    if (feed) {
      yield* Feed.append(feed, makeSampleResults(provider)).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
    }
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-product-search/SearchArticle',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Provider.Provider, Result.Result, Search.Search],
          onClientInitialized: seedSpace,
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        ProductSearchPlugin(),
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
