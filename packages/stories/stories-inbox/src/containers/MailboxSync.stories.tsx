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
// The mailbox starts empty and unbound. The auth button (from `@dxos/plugin-connector`,
// available because `ConnectorPlugin` is installed) offers both connectors:
//   - Gmail: OAuth popup flow (needs the Edge service configured — see `config` below).
//   - JMAP/Fastmail: a credential form (host + email + token), no OAuth.
// Completing either binds an `AccessToken` + `Connection` + `SyncBinding` to the mailbox;
// the LEFT button then flips to a refresh button whose click runs a real
// (`GoogleMailApi.Live` / `JmapMailApi.Live`) sync into the mailbox feed.
//
// Run in CHROME (`ConnectorPlugin` uses a lazy import that WebKit resolves unreliably under
// vite-dev). Known live risks: (1) Edge must accept the ephemeral storybook identity for OAuth
// initiation; (2) the `Live` sync calls the mail API directly from the browser, a path normally
// exercised on Edge/Node — CORS is expected to work (Google REST + JMAP allow it; the Gmail
// helper disables the Effect HTTP tracer, the known preflight workaround) but must be verified.
//
// Storage is persistent (OPFS), so the identity, mailbox, and any connection/synced mail survive a
// page reload — reopen the story and pick up where you left off. The top toolbar shows the current
// identity key and a Reset button that wipes local storage and reloads to a fresh identity.

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useEffect, useState } from 'react';

import { AiService, Provider } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { LayerSpec, Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter, Order, Query, Ref, Tag } from '@dxos/echo';
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
import { FactViewer } from '@dxos/react-ui-rdf';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

// Shared attention context id: the LEFT article writes its selection under this id
// (`showItem({ contextId })`) and the render component reads it back to drive the MIDDLE column.
const ATTENDABLE_ID = 'story';

// Composer's public Edge deployment — satisfies the connector coordinator's
// `invariant(edgeUrl, 'EDGE services not configured.')` so OAuth initiation can run.
const EDGE_URL = 'https://edge.dxos.workers.dev/';

// Local Ollama model driving `EnrichMailbox` fact extraction in the `EnrichFacts` variant. Ollama
// reliably fails structured output, so the operation is invoked with `strict: false`.
const OLLAMA_MODEL = 'com.meta.model.llama-3-2-3b.instruct';

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

const MailboxSyncStory = ({ enrich = false }: { enrich?: boolean }) => {
  const client = useClient();
  const identity = useIdentity();
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
  const [factsNonce, setFactsNonce] = useState(0);
  const [enriching, setEnriching] = useState(false);
  useEffect(() => {
    if (!registry || !space?.id) {
      setFacts([]);
      return;
    }

    // Ignore a late resolve after unmount / space change so we never set state on a stale store.
    let cancelled = false;
    void EffectEx.runPromise(
      registry
        .forSpace(space.id)
        .query({})
        .pipe(Effect.orElseSucceed((): RDF.Fact[] => [])),
    ).then((result) => {
      if (!cancelled) {
        setFacts(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [registry, space?.id, factsNonce]);

  // Runs `EnrichMailbox` against the local Ollama model, then refreshes the facts column. The
  // in-memory FactStore is not ECHO-reactive, so the read is re-triggered via `factsNonce`.
  const handleEnrich = useCallback(async () => {
    if (!invoker || !mailbox || !space?.id) {
      return;
    }

    setEnriching(true);
    try {
      const { error } = await invoker.invokePromise(
        InboxOperation.EnrichMailbox,
        { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL, provider: Provider.ollama.id, strict: false },
        { spaceId: space.id },
      );
      if (error) {
        log.warn('EnrichMailbox failed', { error });
      }
      setFactsNonce((nonce) => nonce + 1);
    } finally {
      setEnriching(false);
    }
  }, [invoker, mailbox, space?.id]);

  // The toolbar (and its Reset button) must render regardless of whether the space/mailbox have loaded.
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
          {enrich && (
            <Toolbar.Button onClick={handleEnrich} disabled={!mailbox || enriching}>
              {enriching ? 'Enriching…' : 'Enrich'}
            </Toolbar.Button>
          )}
          <Toolbar.Text>{identity ? `Identity: ${identity.identityKey.truncate()}` : 'No identity'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='dx-container grid grid-cols-[1fr_2fr_1fr]' {...attentionAttrs}>
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
          <FactViewer facts={facts} />
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
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: SYNC_STORY_TYPES,
          config: new Config({
            runtime: {
              services: { edge: { url: EDGE_URL } },
              client: { storage: { persistent: true } },
            },
          }),
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
              const { personalSpace } = yield* initializeIdentity(client);
              // Seed an empty mailbox (with its backing feed); the connect/sync flow populates it live.
              personalSpace.db.add(Mailbox.make());
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
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

// Replaces the RIGHT connection column with a `FactViewer` and adds an Enrich toolbar button that
// runs `EnrichMailbox` against the local Ollama model (see `StoryAiPlugin`).
export const EnrichFacts: Story = {
  render: () => <MailboxSyncStory enrich />,
};
