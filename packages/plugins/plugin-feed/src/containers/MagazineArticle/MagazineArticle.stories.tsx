//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { generateCuratedPost, generateFeed, generateMagazine } from '#testing';
import { Magazine, Subscription } from '#types';

import { FeedPlugin } from '../../FeedPlugin';
import { translations } from '../../translations';
import { MagazineArticle } from './MagazineArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const magazines = useQuery(space?.db, Filter.type(Magazine.Magazine));
  const magazine = magazines[0];
  if (!magazine) {
    return <Loading />;
  }
  return <MagazineArticle role='article' subject={magazine} attendableId='story' />;
};

const seedSpace =
  (options: { postCount: number; feedCount: number; readFraction: number }) =>
  ({ client }: { client: Client }) =>
    Effect.gen(function* () {
      yield* initializeIdentity(client);
      const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
      yield* Effect.promise(() => space.waitUntilReady());

      const readCount = Math.floor(options.postCount * options.readFraction);
      const posts: Subscription.Post[] = [];
      for (let i = 0; i < options.postCount; i++) {
        posts.push(space.db.add(generateCuratedPost({ read: i < readCount })));
      }

      const feeds: Subscription.Feed[] = [];
      for (let i = 0; i < options.feedCount; i++) {
        feeds.push(space.db.add(generateFeed()));
      }

      space.db.add(generateMagazine({ name: 'Distributed Systems Reading', feeds, posts }));
    });

const buildMeta = (options: {
  postCount: number;
  feedCount: number;
  readFraction: number;
}): Meta<typeof DefaultStory> => ({
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Subscription.Feed, Subscription.Post, Magazine.Magazine],
          onClientInitialized: seedSpace(options),
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        FeedPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
});

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-feed/containers/MagazineArticle',
  ...buildMeta({ postCount: 12, feedCount: 2, readFraction: 0.25 }),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
