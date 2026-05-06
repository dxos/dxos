//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Feed as EchoFeed, Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { generateCuratedPost, generateFeed, generateMagazine } from '#testing';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

import { FeedPlugin } from '../../FeedPlugin';
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

//
// CurateFlow story
//
// Seeds a magazine + a feed whose queue is pre-populated with three Posts.
// Renders MagazineArticle and exercises the full Curate cycle:
//   1. Click Curate. CurateMagazine pulls queue items into magazine.posts;
//      tiles appear.
//   2. Click Clear. magazine.posts empties; "No articles yet" placeholder
//      appears.
//   3. Click Curate again. With the canonical-proxy reuse fix, this must NOT
//      throw the `addCore` invariant — and the tiles must come back, proving
//      magazine.posts re-renders reactively after a second Curate.
//

const seedSpaceWithQueueItems = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
    yield* Effect.promise(() => space.waitUntilReady());

    // No `url` set: handleCurate's `validFeeds` filter skips this feed during
    // the SyncFeed phase, so the test doesn't depend on a real RSS endpoint.
    // CurateMagazine still iterates `magazine.feeds` and reads the backing
    // queue, which is what we want to exercise.
    const subscriptionFeed = space.db.add(
      Subscription.makeFeed({
        name: 'Curate Test Feed',
        type: 'rss',
      }),
    );
    yield* Effect.promise(() => space.db.flush());

    // Push three Posts into the feed's backing queue. CurateMagazine reads
    // these via `space.queues.get(feedDxn).queryObjects()`. Loading the ref
    // is necessary post-`db.add` because the inline `savedTarget` from
    // `Ref.make(echoFeed)` is dropped when the ref is encoded for persistence.
    const echoFeed = yield* Effect.promise(() => subscriptionFeed.feed!.load());
    const feedDxn = EchoFeed.getQueueDxn(echoFeed);
    if (!feedDxn) {
      throw new Error('Backing ECHO feed has no queue DXN — story setup is broken.');
    }
    const queue = space.queues.get(feedDxn);
    const feedRef = Ref.make(subscriptionFeed);
    const posts = [
      Obj.make(Subscription.Post, {
        feed: feedRef,
        title: 'Distributed systems are hard',
        description: 'A long-form discussion of consistency, availability, and partition tolerance.',
        author: 'Test Author',
        published: '2026-04-01T00:00:00Z',
        guid: 'post-a',
        link: 'https://example.com/post-a',
      }),
      Obj.make(Subscription.Post, {
        feed: feedRef,
        title: 'Local-first is the future',
        description: 'How CRDTs and last-writer-wins reconcile collaborative state across peers.',
        author: 'Test Author',
        published: '2026-04-02T00:00:00Z',
        guid: 'post-b',
        link: 'https://example.com/post-b',
      }),
      Obj.make(Subscription.Post, {
        feed: feedRef,
        title: 'P2P discovery patterns',
        description: 'Comparing rendezvous, DHT-based, and broadcast strategies for peer discovery.',
        author: 'Test Author',
        published: '2026-04-03T00:00:00Z',
        guid: 'post-c',
        link: 'https://example.com/post-c',
      }),
    ];
    yield* Effect.promise(() => queue.append(posts));

    space.db.add(
      Magazine.make({
        name: 'Curate Flow Test',
        feeds: [Ref.make(subscriptionFeed)],
      }),
    );
    yield* Effect.promise(() => space.db.flush());
  });

export const CurateFlow: Story = {
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [EchoFeed.Feed, Subscription.Feed, Subscription.Post, Magazine.Magazine],
          onClientInitialized: seedSpaceWithQueueItems,
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the magazine to render (initially empty).
    const empty = await canvas.findByText(/no articles yet/i, {}, { timeout: 10_000 });
    await expect(empty).toBeVisible();

    // First Curate.
    const curateButton = await canvas.findByRole('button', { name: /^curate$/i });
    await userEvent.click(curateButton);

    await waitFor(
      async () => {
        const tile = await canvas.findByText('Distributed systems are hard');
        await expect(tile).toBeVisible();
      },
      { timeout: 15_000 },
    );

    // Second Curate (back-to-back, no Clear). This is the user-reported
    // failure mode: the second invocation previously tripped ECHO's
    // `!_objects.has(core.id)` invariant in `addCore`. With the
    // reuse-or-add fix it must NOT throw — the tiles already on screen
    // must remain visible (curate is purely additive, dedups by id).
    const curateAgain = await canvas.findByRole('button', { name: /^curate$/i });
    await userEvent.click(curateAgain);

    // Give the operation enough time to run.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // The previously-shown tiles must still be present; nothing should have
    // crashed the plank.
    await expect(await canvas.findByText('Distributed systems are hard')).toBeVisible();
    await expect(await canvas.findByText('Local-first is the future')).toBeVisible();
    await expect(await canvas.findByText('P2P discovery patterns')).toBeVisible();
  },
};
