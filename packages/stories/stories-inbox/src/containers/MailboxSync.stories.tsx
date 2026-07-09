//
// Copyright 2026 DXOS.org
//

// Interactive real-mailbox sync playground, driven by the `@dxos/story-modules` surface-grid.
//
// Each column is an app-framework Surface contributed under a `Module.*` role token (see
// `../testing/modules`), and the story picks a token grid for `ModuleContainer`:
//   - CONTROLS  reset / enrich controls + a JSON status readout (owns the enrich pipeline).
//   - MAILBOX   `MailboxArticle` — includes the connect/sync auth button.
//   - MESSAGE   the selected message (companion; tracks the mailbox article's selection).
//   - FACTS     `MailboxFactsCompanion` (enrich variants) / `ConnectorCompanion` (Live).
//
// The mailbox starts empty and unbound (the `SeededFacts` variant populates the feed with demo
// messages for an offline demo). The client is configured WITH an Edge service (an Edge websocket),
// so both connectors are usable:
//   - JMAP/Fastmail: a credential form (host + email + token).
//   - Gmail: its OAuth coordinator (which requires the Edge URL).
//
// Run in CHROME (`ConnectorPlugin` uses a lazy import that WebKit resolves unreliably under
// vite-dev). Storage is persistent (OPFS), so the identity, mailbox, and any connection/synced mail
// survive a page reload — reopen the story and pick up where you left off.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useEffect, useRef } from 'react';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { LayerSpec, Operation, OperationHandlerSet } from '@dxos/compute';
import { configPreset } from '@dxos/config';
import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { ModuleContainer } from '@dxos/story-modules';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { seedDemoMessages } from '../testing/demo-messages';
import { Module, StoryModulesPlugin } from '../testing/modules';

// Schema for every object the connect+sync flow reads or writes: the mailbox + feed, the
// OAuth-created access token / connection / binding / cursor, and the synced messages,
// contacts, and tags.
const SYNC_STORY_TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Organization.Organization,
  Person.Person,
  SyncBinding.SyncBinding,
  Tag.Tag,
  TagIndex.TagIndex,
];

// `showItem` (in the 'storybook' layout mode) dispatches `LayoutOperation.UpdateCompanion` after
// `Select`; `Select` is handled by AttentionPlugin (writes the selection this story reads), but no
// installed plugin handles `UpdateCompanion` (that is DeckPlugin's), so stub it as a no-op.
const StorySyncPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mailboxSync'),
    name: 'Mailbox Sync Story',
  }),
).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
        ),
      ),
  }),
  Plugin.make,
);

// Provides an AiService backed by a local Ollama instance so `EnrichMailbox` extracts facts against
// a local model (start ollama with `OLLAMA_ORIGINS="*" ollama serve`). Contributed on the same
// process-manager lifecycle as the FactStore LayerSpec so it is present when the operation resolves.
const StoryAiPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.ai'),
    name: 'Story Ollama AiService',
  }),
).pipe(
  Plugin.addModule({
    id: 'story-ai',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: Capability.makeModule(
      Effect.fnUntraced(function* () {
        return [
          Capability.contributes(
            Capabilities.LayerSpec,
            LayerSpec.make({ affinity: 'space', requires: [], provides: [AiService.AiService] }, () =>
              // `orDie`: a layer-construction ConfigError is a story setup fault, not a recoverable
              // operation error, and `LayerSpec` requires an empty error channel.
              AiServiceTestingPreset('ollama').pipe(Layer.orDie),
            ),
          ),
        ];
      }),
    ),
  }),
  Plugin.make,
);

// Seeds the feed with demo messages for the `SeededFacts` variant. `seedDemoMessages` is idempotent
// (dedups by subject), so a reload against persistent storage never re-appends; the ref just avoids
// redundant runs within a session. Renders nothing.
const SeedRunner = () => {
  const [space] = useSpaces();
  const db = useDatabase(space?.id);
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!feed || !space || seededRef.current) {
      return;
    }

    seededRef.current = true;
    void EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }, [feed, space]);
  return null;
};

type StoryArgs = {
  enrich?: boolean;
  seed?: boolean;
};

const DefaultStory = ({ enrich = false, seed = false }: StoryArgs) => (
  <>
    {seed && <SeedRunner />}
    <ModuleContainer
      layout={
        enrich
          ? [[Module.Controls], [Module.Mailbox], [Module.Message], [Module.Facts]]
          : [[Module.Controls], [Module.Mailbox], [Module.Message], [Module.Connector]]
      }
    />
  </>
);

const meta = {
  title: 'stories/stories-inbox/MailboxSync',
  render: DefaultStory,
  decorators: [
    withSurfaceDebug(false),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: SYNC_STORY_TYPES,
          // Edge service configured: the client opens an Edge websocket, so both connectors are
          // usable — JMAP/Fastmail via its credential form, and Gmail via its OAuth coordinator
          // (which requires the Edge URL).
          config: new Config(
            {
              runtime: {
                client: { storage: { persistent: true } },
              },
            },
            configPreset({ edge: 'dev' }).values,
          ),
          // OPFS-backed storage so identity/spaces survive a page reload; without a worker the
          // client silently falls back to in-memory storage regardless of `storage.persistent`.
          createOpfsWorker: () => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              // Only seed a fresh identity here — bounded and deterministic. Do NOT try to
              // synchronously recover an existing identity's personal space/mailbox by waiting on
              // the (persisted, asynchronously-loading) space list: if that space never actually
              // shows up (e.g. an identity left over from an interrupted prior run), waiting on it
              // here would block client-capability activation forever, taking the whole story
              // (including the Reset button) down with it. An existing identity's mailbox, if any,
              // just shows up on its own via the story's reactive space/query hooks once it loads.
              if (client.halo.identity.get()) {
                return;
              }

              const { personalSpace: space } = yield* initializeIdentity(client);
              // Seed an empty mailbox (with its backing feed); the connect/sync flow — or the
              // `SeededFacts` variant — populates it. Live/EnrichFacts start empty.
              space.db.add(Mailbox.make());
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        InboxPlugin(),
        ConnectorPlugin(),
        PreviewPlugin(),
        StorySyncPlugin(),
        StoryAiPlugin(),
        StoryModulesPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations, ...connectorTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = {};

// Replaces the RIGHT connection column with the `MailboxFactsCompanion` surface; the CONTROLS column
// adds Enrich, which runs `EnrichMailbox` against the local Ollama model (see `StoryAiPlugin`).
// Operates on real synced mail — connect an account first, or use `SeededFacts` for offline content.
export const EnrichFacts: Story = {
  render: () => <DefaultStory enrich />,
};

// Like `EnrichFacts`, but seeds the feed with a few demo messages so Enrich has content to extract
// without connecting an account — the self-contained offline demo of the extract → facts flow.
export const SeededFacts: Story = {
  render: () => <DefaultStory enrich seed />,
};
