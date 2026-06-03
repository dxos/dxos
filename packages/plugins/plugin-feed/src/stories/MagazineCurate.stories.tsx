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
 * fixture via a mock fetcher). Renders the magazine, then clicks Curate to drive
 * the real RefreshMagazine flow (SyncFeed fetch + parse → CurateMagazine →
 * `magazine.posts`).
 *
 * Skipped in CI (`!test`) and intended for manual/interactive use:
 *  - the AI-driven curation path is not mocked, and
 *  - the storybook client wire-up does not reliably surface queue contents to
 *    the CurateMagazine operation (same limitation that quarantines
 *    `MagazineArticle.stories` `CurateFlow`); the flow works in the real app.
 *
 * The fixture → mock-fetcher → parse layer is covered deterministically by
 * `theregister-fixture.test.ts`; the curation logic by `curate-magazine.test.ts`.
 */
export const Default: Story = {
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const empty = await canvas.findByText(/no articles yet/i, {}, { timeout: 10_000 });
    await expect(empty).toBeVisible();

    const curateButton = await canvas.findByRole('button', { name: /^curate$/i });
    await userEvent.click(curateButton);

    await waitFor(
      async () => {
        const tile = await canvas.findByText(/sovereign ai/i);
        await expect(tile).toBeVisible();
      },
      { timeout: 15_000 },
    );
  },
};
