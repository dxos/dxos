//
// Copyright 2026 DXOS.org
//

// Interactive real-mailbox sync playground.
//
// Three columns, each a real plugin surface whose data this story controls:
//   - LEFT   `MailboxArticle` — includes the connect/sync auth button.
//   - MIDDLE the selected message (message companion; tracks the LEFT selection).
//   - RIGHT  `ConnectorCompanion` — the connection bound to the mailbox (once connected).
//
// The mailbox starts empty and unbound (the `SeededFacts` variant populates the feed with demo
// messages for an offline demo). The client is configured WITH an Edge service (an Edge websocket),
// so both connectors are usable:
//   - JMAP/Fastmail: a credential form (host + email + token).
//   - Gmail: its OAuth coordinator (which requires the Edge URL).
// Completing JMAP binds an `AccessToken` + `Connection` + `SyncBinding` to the mailbox;
// the LEFT button then flips to a refresh button whose click runs a real
// (`JmapMailApi.Live`) sync into the mailbox feed.
//
// Run in CHROME (`ConnectorPlugin` uses a lazy import that WebKit resolves unreliably under
// vite-dev). Known live risk: the `Live` sync calls the mail API directly from the browser, a path
// normally exercised on Edge/Node — CORS is expected to work (JMAP allows it) but must be verified.
//
// Storage is persistent (OPFS), so the identity, mailbox, and any connection/synced mail survive a
// page reload — reopen the story and pick up where you left off. The top toolbar shows the current
// identity key and a Reset button that wipes local storage and reloads to a fresh identity.

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { AiService, Provider } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import { Surface, useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { LayerSpec, Operation, OperationHandlerSet } from '@dxos/compute';
import { configPreset } from '@dxos/config';
import { Database, Feed, Filter, Order, Query, Ref, Tag } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { InboxCapabilities, InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookCapabilities, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config, useClient } from '@dxos/react-client';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { seedDemoMessages } from '../testing/demo-messages';

// Shared attention context id: the LEFT article writes its selection under this id
// (`showItem({ contextId })`) and the render component reads it back to drive the MIDDLE column.
const ATTENDABLE_ID = 'story';

// Local Ollama model driving `EnrichMailbox` fact extraction in the `EnrichFacts` variant. A 7B
// model extracts facts far more reliably than a 3B one; swap for any model pulled locally. Ollama
// reliably fails structured output, so the operation is invoked with `strict: false`.
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

// Schema for every object the connect+sync flow reads or writes: the mailbox + feed, the
// OAuth-created access token / connection / binding / cursor, and the synced messages,
// contacts, and tags.
const SYNC_STORY_TYPES = [
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Person.Person,
  Organization.Organization,
  Tag.Tag,
  TagIndex.TagIndex,
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  SyncBinding.SyncBinding,
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

type ControlsProps = {
  enrich: boolean;
  enriching: boolean;
  hasFeed: boolean;
  hasMailbox: boolean;
  facts: RDF.Fact[];
  onReset: () => void;
  onResetCursor: () => void;
  onResetFactStore: () => void;
  onStop: () => void;
  onEnrich: () => void;
};

// First column: the story's controls (reset / enrich) plus a JSON status readout. Reads the identity
// itself and derives the status counts from `facts` so the parent only passes actions + shared state.
const Controls = ({
  enrich,
  enriching,
  hasFeed,
  hasMailbox,
  facts,
  onReset,
  onResetCursor,
  onResetFactStore,
  onStop,
  onEnrich,
}: ControlsProps) => {
  const identity = useIdentity();
  // Distinct fact sources = messages that have produced facts (a live "processed" proxy).
  const processedCount = new Set(facts.map((fact) => fact.attribution.source)).size;
  const factsCount = facts.length;

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={onReset}>Reset store</Toolbar.Button>
          {enrich && (
            <>
              <Toolbar.Button onClick={onResetCursor} disabled={!hasFeed || enriching}>
                Reset cursor
              </Toolbar.Button>
              <Toolbar.Button onClick={onResetFactStore} disabled={enriching}>
                Reset facts
              </Toolbar.Button>
              {enriching ? (
                <Toolbar.Button onClick={onStop}>Stop</Toolbar.Button>
              ) : (
                <Toolbar.Button onClick={onEnrich} disabled={!hasMailbox}>
                  Enrich
                </Toolbar.Button>
              )}
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm'>
        {enrich && (
          <JsonHighlighter data={{ identity: identity?.identityKey.truncate(), processedCount, factsCount }} />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const MailboxSyncStory = ({ enrich = false, seed = false }: { enrich?: boolean; seed?: boolean }) => {
  const client = useClient();
  const [space] = useSpaces();
  const db = useDatabase(space?.id);
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));
  const attentionAttrs = useAttentionAttributes(ATTENDABLE_ID);

  // Wipes local storage (identity, spaces, mailbox, synced mail) and reloads to a fresh identity.
  // `client.reset()` leaves the client unusable in place, so a full reload is required.
  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  // The connector auth surface only renders when `useActiveSpace()` resolves, which reads the
  // layout workspace path; StorybookPlugin defaults it to 'default'.
  const layoutState = useCapability(StorybookCapabilities.LayoutState);
  const setLayout = useAtomSet(layoutState);
  useEffect(() => {
    if (space) {
      setLayout((state) => ({ ...state, workspace: Paths.getSpacePath(space.id) }));
    }
  }, [space, setLayout]);

  // Feed.
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );

  // Seed variant: populate the feed with demo messages so Enrich has content without a live
  // connection. `seedDemoMessages` is idempotent (dedups by subject), so a reload against persistent
  // storage never re-appends; the ref just avoids redundant runs within a session.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seed || !feed || !space || seededRef.current) {
      return;
    }
    seededRef.current = true;
    void EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }, [seed, feed, space]);

  // Selected message.
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  const message = messages.find((candidate) => candidate.id === selectedId);

  // Sync binding.
  const bindings = useQuery(
    db,
    mailbox ? Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding) : Query.select(Filter.nothing()),
  );
  const binding = bindings.find(SyncBinding.instanceOf);

  // Facts (enrich variant): the shared per-space FactStore populated by `EnrichMailbox`. Read via
  // `useCapabilities` (not `useCapability`) so the story never throws if the process-manager
  // capabilities are not yet active.
  const [registry] = useCapabilities(InboxCapabilities.FactStoreRegistry);
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [enriching, setEnriching] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    // Reset on (re)mount: StrictMode mounts→unmounts→remounts, and a ref only initialized to `true`
    // would stay `false` after the first unmount, silently dropping every later `setFacts`.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reads the whole store; the in-memory FactStore is not ECHO-reactive, so refreshes are explicit
  // (on space change, on a progress tick, and when a run settles).
  const refreshFacts = useCallback(async () => {
    if (!registry || !space?.id) {
      if (mountedRef.current) {
        setFacts([]);
      }
      return;
    }

    const result = await EffectEx.runPromise(
      registry
        .forSpace(space.id)
        .query({})
        .pipe(
          Effect.tapError((error) => Effect.sync(() => log.warn('refreshFacts: query failed', { error }))),
          Effect.orElseSucceed((): RDF.Fact[] => []),
        ),
    );
    if (mountedRef.current) {
      setFacts(result);
    }
  }, [registry, space?.id]);

  useEffect(() => {
    void refreshFacts();
  }, [refreshFacts]);

  // Poll the store for live progress while a run is in flight (facts are committed per page).
  useEffect(() => {
    if (!enriching) {
      return;
    }
    const timer = setInterval(() => void refreshFacts(), 500);
    return () => clearInterval(timer);
  }, [enriching, refreshFacts]);

  // Holds the running invocation's cancel handle; `undefined` when idle.
  const cancelRef = useRef<(() => void) | undefined>(undefined);

  // Forks `EnrichMailbox` (against the local Ollama model) so the Stop button can interrupt it —
  // `invoke` returns a self-contained effect, so a fork + cancel maps directly onto start/stop.
  const handleEnrich = useCallback(() => {
    if (!invoker || !mailbox || !space?.id || cancelRef.current) {
      return;
    }

    setEnriching(true);
    const cancel = Effect.runCallback(
      invoker.invoke(
        InboxOperation.EnrichMailbox,
        // `pageSize: 1` commits facts after each message so the toolbar progress ticks live (rather
        // than only at the end of a large page).
        { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL, provider: Provider.ollama.id, strict: false, pageSize: 1 },
        { spaceId: space.id },
      ),
      {
        onExit: (exit: Exit.Exit<{ processed: number; facts: number }, Error>) => {
          cancelRef.current = undefined;
          if (mountedRef.current) {
            setEnriching(false);
          }
          void refreshFacts();
          // Interruption (Stop) is expected; only surface genuine failures.
          if (Exit.isFailure(exit) && !Exit.isInterrupted(exit)) {
            log.warn('EnrichMailbox failed', { cause: exit.cause });
          }
        },
      },
    );
    cancelRef.current = () => cancel();
  }, [invoker, mailbox, space?.id, refreshFacts]);

  // Interrupts the running invocation; `onExit` clears state and does a final refresh.
  const handleStop = useCallback(() => {
    cancelRef.current?.();
  }, []);

  // Clears the feed's processing cursor so the next Enrich reconsiders the feed from the start.
  // NOTE: the pipeline also dedups against sources already in the FactStore, so already-extracted
  // messages still won't re-extract until the store is cleared (a full identity Reset does that).
  const handleResetCursor = useCallback(() => {
    if (!registry || !space?.id || !feed) {
      return;
    }

    registry.feedCursorsFor(space.id).reset(feed.id);
  }, [registry, space?.id, feed]);

  // Clears the space's in-memory FactStore so a subsequent Enrich re-extracts from scratch. Pair with
  // Reset cursor to fully re-process the feed. The store is not ECHO-reactive, so refresh explicitly.
  const handleResetFactStore = useCallback(() => {
    if (!registry || !space?.id) {
      return;
    }

    void EffectEx.runPromise(
      registry
        .forSpace(space.id)
        .clear()
        .pipe(
          Effect.tapError((error) => Effect.sync(() => log.warn('resetFactStore: clear failed', { error }))),
          Effect.orElseSucceed(() => undefined),
        ),
    ).then(() => refreshFacts());
  }, [registry, space?.id, refreshFacts]);

  // Four columns: a CONTROLS panel (the story's toolbar + status), then the mailbox, the selected
  // message, and the facts/connection column. The controls panel renders regardless of whether the
  // space/mailbox have loaded.
  return (
    <Panel.Root>
      <Panel.Content className='dx-container grid grid-cols-[2fr_2fr_3fr_2fr]' {...attentionAttrs}>
        <Controls
          enrich={enrich}
          enriching={enriching}
          hasFeed={!!feed}
          hasMailbox={!!mailbox}
          facts={facts}
          onReset={handleReset}
          onResetCursor={handleResetCursor}
          onResetFactStore={handleResetFactStore}
          onStop={handleStop}
          onEnrich={handleEnrich}
        />

        <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: ATTENDABLE_ID }} limit={1} />

        {message ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: message, companionTo: mailbox, attendableId: ATTENDABLE_ID }}
            limit={1}
          />
        ) : (
          <div className='h-full grid place-items-center text-description'>Select a message</div>
        )}

        {enrich ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={{ companionTo: mailbox, attendableId: ATTENDABLE_ID }}
            limit={1}
          />
        ) : binding ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: binding, companionTo: mailbox, attendableId: ATTENDABLE_ID }}
            limit={1}
          />
        ) : (
          <div className='h-full grid place-items-center text-description'>Not connected yet</div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const DefaultStory = () => <MailboxSyncStory />;

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

// Replaces the RIGHT connection column with the `MailboxFactsCompanion` surface and adds an Enrich
// toolbar button that runs `EnrichMailbox` against the local Ollama model (see `StoryAiPlugin`).
// Operates on real synced mail — connect an account first, or use `SeededFacts` for offline content.
export const EnrichFacts: Story = {
  render: () => <MailboxSyncStory enrich />,
};

// Like `EnrichFacts`, but seeds the feed with a few demo messages so Enrich has content to extract
// without connecting an account — the self-contained offline demo of the extract → facts flow.
export const SeededFacts: Story = {
  render: () => <MailboxSyncStory enrich seed />,
};
