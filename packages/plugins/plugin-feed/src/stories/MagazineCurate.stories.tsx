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
import { Routine } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

import { MagazineArticle } from '../containers/MagazineArticle/MagazineArticle';
import { FeedPlugin } from '../FeedPlugin';

// Source the magazine from the live The Register "AI + ML" feed.
const REGISTER_FEED_URL =
  'https://api.theregister.com/api/v1/article?query=tag:%22ai%20and%20ml%22&orderBy=published&site_id=2&remapper=rss&limit=25';

// Mock fetcher: serve the bundled fixture instead of hitting the network so the
// story is deterministic offline. Matches both the direct URL (seed) and the
// browser CORS-proxied form (`/api/rss?url=<encoded>`) used by SyncFeed; the
// encoded URL still contains the literal `theregister.com`. Other URLs delegate
// to the original fetch.
// eslint-disable-next-line no-restricted-globals
const originalFetch = globalThis.fetch.bind(globalThis);
const installRegisterFetchMock = async () => {
  const { default: registerFeedXml } = await import('./fixtures/theregister-ai.xml?raw');
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    if (url.includes('theregister.com')) {
      return new Response(registerFeedXml, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
};

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

const seedRegisterMagazine = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* Effect.promise(() => installRegisterFetchMock());
    yield* initializeIdentity(client);
    const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
    yield* Effect.promise(() => space.waitUntilReady());

    // Feed points at the real Register AI/ML URL; the mock fetcher serves the
    // bundled fixture. Posts are NOT pre-seeded — clicking Curate drives the
    // live RefreshMagazine flow (SyncFeed fetches + parses, then CurateMagazine
    // pulls the queued Posts into `magazine.posts`).
    const feed = space.db.add(
      Subscription.makeSubscription({ name: 'The Register — AI + ML', url: REGISTER_FEED_URL, type: 'rss' }),
    );

    // Magazine pointed at a curation Routine (parented to the magazine).
    const routine = Routine.make({ name: 'Curation', instructions: 'Prefer stories relating to sovereign AI.' });
    const magazine = Magazine.make({ name: 'The Register — AI', feeds: [Ref.make(feed)], routine: Ref.make(routine) });
    Obj.setParent(routine, magazine);
    space.db.add(magazine);
    yield* Effect.promise(() => space.db.flush());
    // Exposed so the play function can assert the curation result directly.
    (globalThis as any).__feedCurateMagazine = magazine;
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-feed/stories/MagazineCurate',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Subscription.Subscription,
            Subscription.Post,
            Magazine.Magazine,
            Routine.Routine,
            Text.Text,
          ],
          onClientInitialized: seedRegisterMagazine,
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
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Live curation against the The Register "AI + ML" feed (served from a bundled
 * fixture via a mock fetcher). Renders the empty magazine, then clicks Curate to
 * drive the real RefreshMagazine flow: SyncFeed fetches + parses the feed, then
 * CurateMagazine pulls the matching Posts into `magazine.posts`.
 *
 * The play asserts the curation RESULT (`magazine.posts` grows). Curated Posts
 * are queue-backed refs: their tiles render in the running app, but the storybook
 * client harness doesn't reliably resolve those refs to tiles, so the UI may
 * still show the empty-state placeholder here even though curation succeeded.
 *
 * Skipped in CI (`!test`) — browser/timing-sensitive interactive demo. The
 * deterministic logic is covered by `theregister-fixture.test.ts` (fetch → parse)
 * and `curate-magazine.test.ts` (curation). The AI/blueprint path is out of scope.
 */
export const Default: Story = {
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Starts empty.
    const empty = await canvas.findByText(/no articles yet/i, {}, { timeout: 10_000 });
    await expect(empty).toBeVisible();

    // Curate: SyncFeed (mock fetch → parse) then CurateMagazine populate the magazine.
    const curateButton = await canvas.findByRole('button', { name: /^curate$/i });
    await userEvent.click(curateButton);

    // Verify curation populated the magazine (the fixture has 4 AI/ML articles).
    await waitFor(
      async () => {
        const magazine = (globalThis as any).__feedCurateMagazine as Magazine.Magazine | undefined;
        await expect(magazine?.posts.length ?? 0).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
  },
};
