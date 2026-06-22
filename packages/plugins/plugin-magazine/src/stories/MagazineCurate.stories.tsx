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
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppPlugin } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AgentHandlers } from '@dxos/assistant-toolkit';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { LayerSpec } from '@dxos/compute';
import { DXN, Feed, Filter, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { MagazineBlueprint } from '#blueprints';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

import { MagazineArticle } from '../containers/MagazineArticle/MagazineArticle';
import { MagazinePlugin } from '../MagazinePlugin';

// Curation runs the agent (CurateMagazine → AgentPrompt). The process-manager runtime therefore needs
// the full agent stack: AutomationPlugin supplies the OpaqueToolkit / Registry / Trace LayerSpecs and
// MagazinePlugin the curation handlers; this story-local plugin adds the AgentPrompt handler and a
// live edge AiService (the 'edge-remote' testing preset — no client edge-config or credentials needed).
// Excluded from CI (the `Test` story is `!test`); intended for manual, signed-in, online use.
const aiServiceSpec = LayerSpec.make(
  { affinity: 'space', requires: [], provides: [AiService.AiService] },
  () => AiServiceTestingPreset('edge-remote').pipe(Layer.orDie),
);

const AgentRuntimePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.magazineStoryAgent'), name: 'Magazine Story Agent Runtime' }),
).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: Capability.makeModule(() => Effect.succeed([Capability.contributes(Capabilities.OperationHandler, AgentHandlers)])),
  }),
  Plugin.addModule({
    id: 'ai-service',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: Capability.makeModule(() => Effect.succeed([Capability.contributes(Capabilities.LayerSpec, aiServiceSpec)])),
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

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const magazines = useQuery(space?.db, Filter.type(Magazine.Magazine));
  const magazine = magazines[0];
  if (!magazine) {
    return <Loading />;
  }

  // Two columns: the article (curated tiles + Curate toolbar) and the properties (topic / routine editor).
  return (
    <div role='none' className='grid bs-full is-full grid-cols-[minmax(0,1fr)_24rem]'>
      <MagazineArticle role='article' subject={magazine} attendableId='story' />
      <Panel.Root classNames='border-is border-separator'>
        <Panel.Content asChild>
          <ObjectProperties object={magazine}>
            <Surface.Surface type={AppSurface.ObjectProperties} data={{ subject: magazine }} />
          </ObjectProperties>
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};

const seedRegisterMagazine = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
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

    const magazine = Magazine.make({ name: 'The Register — AI', feeds: [Ref.make(feed)] });
    space.db.add(magazine);
    // Curation resolves the base methodology blueprint from the registry; register it here since the
    // automation plugin (which normally syncs BlueprintDefinition capabilities) isn't in this story.
    client.graph.registry.add([MagazineBlueprint.make()]);
    yield* Effect.promise(() => space.db.flush());
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
        AutomationPlugin(),
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
 * Live, agent-driven curation against the The Register "AI + ML" feed (served from a
 * bundled fixture via a mock fetcher; the LLM call is real). Clicking Curate drives the
 * full flow: SyncFeed fetches + parses the feed, then CurateMagazine runs the persisted
 * Routine through AgentPrompt (live edge model) to select matching Posts into
 * `magazine.posts`, which render as tiles.
 *
 * Excluded from CI (`!test`) — requires network + a reachable edge model and is
 * non-deterministic/slow. Run it manually (signed in, online). The deterministic pieces
 * are covered by `theregister-fixture.test.ts` (fetch → parse) and `curate-magazine.test.ts`
 * (keep/select helpers); the agent path by the memoized `curate-magazine.blueprint.test.ts`.
 */
export const Test: Story = {
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Starts empty.
    const empty = await canvas.findByText(/no articles yet/i, {}, { timeout: 10_000 });
    await expect(empty).toBeVisible();

    // Curate: SyncFeed (mock fetch → parse) then the agent selects Posts via the live model.
    const curateButton = await canvas.findByRole('button', { name: /^curate$/i });
    await userEvent.click(curateButton);

    // The agent selection is non-deterministic, so assert only that curation produced tiles
    // (the empty-state placeholder is replaced). Generous timeout for the live model round-trip.
    await waitFor(() => expect(canvas.queryByText(/no articles yet/i)).toBeNull(), { timeout: 120_000 });
  },
};
