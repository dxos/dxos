//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AgentHandlers } from '@dxos/assistant-toolkit';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { LayerSpec } from '@dxos/compute';
import { DXN, Feed, Filter, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { MagazineSkill } from '#skills';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

import { MagazineArticle } from '../containers/MagazineArticle/MagazineArticle';
import { MagazinePlugin } from '../MagazinePlugin';

// Curation runs the agent (CurateMagazine → RunInstructions). The process-manager runtime therefore needs
// the full agent stack: RoutinePlugin supplies the OpaqueToolkit / Registry / Trace LayerSpecs and
// MagazinePlugin the curation handlers; this story-local plugin adds the RunInstructions handler and a
// live edge AiService (the 'edge-remote' testing preset — no client edge-config or credentials needed).
// Excluded from CI (the `Test` story is `!test`); intended for manual, signed-in, online use.
const aiServiceSpec = LayerSpec.make({ affinity: 'space', requires: [], provides: [AiService.AiService] }, () =>
  AiServiceTestingPreset('edge-remote').pipe(Layer.orDie),
);

const AgentRuntimePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.magazineStoryAgent'), name: 'Magazine Story Agent Runtime' }),
).pipe(
  Plugin.addLazyModule<void>(
    Capability.inlineModule('operation-handler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([Capability.provide(Capabilities.OperationHandler, AgentHandlers)]),
    ),
  ),
  Plugin.addModule({
    id: 'ai-service',
    provides: [Capabilities.LayerSpec],
    activate: () => Effect.succeed([Capability.provide(Capabilities.LayerSpec, aiServiceSpec)]),
  }),
  Plugin.make,
);

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
  const registerFetchMock: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('theregister.com')) {
      return new Response(registerFeedXml, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = registerFetchMock;
};

// Bridge from the seed (runs in the plugin-manager/client-init context) to the `Curate` play test,
// which reads ECHO state directly. A module-level variable does not survive Storybook's seed↔play
// boundary, so a shared global is used (mirrors plugin-space/plugin-debug story seeds).
declare global {
  // eslint-disable-next-line no-var
  var __magazineStoryContext: { space: Space; magazine: Magazine.Magazine } | undefined;
}

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const magazines = useQuery(space?.db, Filter.type(Magazine.Magazine));
  const magazine = magazines[0];
  if (!magazine) {
    return <Loading />;
  }

  return (
    <Panel.Root classNames='border-is border-separator'>
      <Panel.Content className='px-3 grid grid-cols-2 gap-3'>
        {/* Rendered directly: the `article` role is shared with plugin-space's catch-all RecordArticle
            (position:last), so a raw `Surface type={Article}` here is ambiguous and resolves to the
            fallback — the deck disambiguates via the app-graph node, which a story has no equivalent of. */}
        <MagazineArticle role='article' subject={magazine} attendableId='story' />
        {/* The object-properties companion surface (plugin-space DefaultProperties); 'settings' is unambiguous. */}
        <Surface.Surface type={AppSurface.Article} data={{ subject: 'settings', companionTo: magazine }} />
      </Panel.Content>
    </Panel.Root>
  );
};

const seedRegisterMagazine = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    globalThis.__magazineStoryContext = undefined;
    yield* Effect.promise(() => installRegisterFetchMock());
    yield* initializeIdentity(client);
    const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
    yield* Effect.promise(() => space.waitUntilReady());

    // Feed points at the real Register AI/ML URL; the mock fetcher serves the
    // bundled fixture. Posts are NOT pre-seeded — clicking Curate drives the live
    // flow (SyncFeed fetches + parses, then CurateMagazine runs the Routine via the
    // agent to select Posts into `magazine.posts`).
    const feed = space.db.add(
      Subscription.makeSubscription({ name: 'The Register — AI + ML', url: REGISTER_FEED_URL, type: 'rss' }),
    );

    const magazine = Magazine.make({ name: 'AI', feeds: [Ref.make(feed)] });
    space.db.add(magazine);
    // Curation resolves the base methodology skill from the registry; register it here since the
    // automation plugin (which normally syncs SkillDefinition capabilities) isn't in this story.
    client.graph.registry.add([MagazineSkill.make()]);
    yield* Effect.promise(() => space.db.flush());

    globalThis.__magazineStoryContext = { space, magazine };
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-magazine/stories/MagazineCurate',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine, Text.Text],
          onClientInitialized: seedRegisterMagazine,
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        RoutinePlugin(),
        MagazinePlugin(),
        AgentRuntimePlugin(),
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

/**
 * Live, agent-driven curation end-to-end against the The Register "AI + ML" feed (the feed fetch is
 * served from a bundled fixture, but the LLM call is real). It verifies:
 *   1. the curation Routine exists — created with the magazine (Magazine.make), so it is present
 *      before any curate; and
 *   2. clicking Curate pulls the feed (SyncFeed) and runs that Routine via RunInstructions against the
 *      live edge model, which selects matching Posts into `magazine.posts` (rendered as tiles).
 *
 * The seed stashes the space + magazine in module scope so the play can read ECHO state directly.
 *
 * Excluded from CI (`!test`) — needs network + a reachable edge model and is non-deterministic/slow;
 * run it manually (signed in, online). Deterministic pieces are covered by `theregister-fixture.test.ts`
 * (fetch → parse), `curate-magazine.test.ts`, and `Magazine.test.ts`; the agent path by
 * `curate-magazine.skill.test.ts`.
 */
export const Curate: Story = {
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The seed sets the context at the end of its async init, which can land just after the magazine
    // first renders — so wait for it rather than reading once.
    await waitFor(() => expect(globalThis.__magazineStoryContext, 'story seed did not run').toBeDefined(), {
      timeout: 15_000,
    });
    const { magazine } = globalThis.__magazineStoryContext!;

    // The curation Routine is created with the magazine, not on curate.
    await expect(magazine.instructions).toBeDefined();

    // Starts empty; clicking Curate pulls the feed and runs the Routine.
    await expect(await canvas.findByText(/no articles yet/i, {}, { timeout: 10_000 })).toBeVisible();
    await userEvent.click(await canvas.findByRole('button', { name: /^curate$/i }));

    // Feed pulled + Routine run: the agent (live edge model) selects synced candidates into the
    // magazine — tiles replace the empty state.
    await waitFor(() => expect(magazine.posts.length).toBeGreaterThan(0), { timeout: 120_000 });
    await waitFor(() => expect(canvas.queryByText(/no articles yet/i)).toBeNull(), { timeout: 5_000 });
  },
};
