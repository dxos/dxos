//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { Provider } from '@dxos/ai';
import { ActivationEvents, Capabilities, Capability, Plugin, Role } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Order, Query, Ref } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';
import { SyncBinding } from '@dxos/plugin-connector';
import { InboxCapabilities, InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Message } from '@dxos/types';

// Shared attention context id: the mailbox article writes its selection under this id and the message
// module reads it back.
const ATTENDABLE_ID = 'story';

// Local Ollama model driving `EnrichMailbox` fact extraction. Ollama reliably fails structured
// output, so the operation is invoked with `strict: false`.
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

/**
 * Role tokens for the MailboxSync story columns. Each module is contributed as a dedicated
 * `Capabilities.ReactSurface` under its own role NSID (role-only dispatch), so a story layout is a
 * plain grid of these tokens and each surface resolves the active space via `useActiveSpace()`.
 */
export const Module = {
  Controls: Role.make<Record<string, any>>('org.dxos.storybook.inbox.controls'),
  Mailbox: Role.make<Record<string, any>>('org.dxos.storybook.inbox.mailbox'),
  Message: Role.make<Record<string, any>>('org.dxos.storybook.inbox.message'),
  Facts: Role.make<Record<string, any>>('org.dxos.storybook.inbox.facts'),
  Connector: Role.make<Record<string, any>>('org.dxos.storybook.inbox.connector'),
};

//
// Column modules
//

/** LEFT: the mailbox article (includes the connect/sync auth button). */
const MailboxModule = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  return (
    <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: ATTENDABLE_ID }} limit={1} />
  );
};

/** The selected message (companion of the mailbox; tracks the mailbox article's selection). */
const MessageModule = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  const message = messages.find((candidate) => candidate.id === selectedId);
  return message ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: message, companionTo: mailbox, attendableId: ATTENDABLE_ID }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-description'>Select a message</div>
  );
};

/** The extracted-facts companion (`MailboxFactsCompanion`), populated by `EnrichMailbox`. */
const FactsModule = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  return (
    <Surface.Surface type={AppSurface.Article} data={{ companionTo: mailbox, attendableId: ATTENDABLE_ID }} limit={1} />
  );
};

/** The connection bound to the mailbox (once connected). */
const ConnectorModule = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const bindings = useQuery(
    space.db,
    mailbox ? Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding) : Query.select(Filter.nothing()),
  );
  const binding = bindings.find(SyncBinding.instanceOf);
  return binding ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: binding, companionTo: mailbox, attendableId: ATTENDABLE_ID }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-description'>Not connected yet</div>
  );
};

/** Reset / enrich controls plus a JSON status readout — owns the enrich pipeline. */
const ControlsModule = ({ space }: { space: Space }) => {
  const client = useClient();
  const identity = useIdentity();
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const [registry] = useCapabilities(InboxCapabilities.FactStoreRegistry);
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [enriching, setEnriching] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reads the whole store; the in-memory FactStore is not ECHO-reactive, so refreshes are explicit.
  const refreshFacts = useCallback(async () => {
    if (!registry) {
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
  }, [registry, space.id]);

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

  const cancelRef = useRef<(() => void) | undefined>(undefined);

  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  const handleResetCursor = useCallback(() => {
    if (!registry || !feed) {
      return;
    }
    registry.feedCursorsFor(space.id).reset(feed.id);
  }, [registry, space.id, feed]);

  const handleResetFactStore = useCallback(() => {
    if (!registry) {
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
  }, [registry, space.id, refreshFacts]);

  const handleEnrich = useCallback(() => {
    if (!invoker || !mailbox || cancelRef.current) {
      return;
    }
    setEnriching(true);
    const cancel = Effect.runCallback(
      invoker.invoke(
        InboxOperation.EnrichMailbox,
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
          if (Exit.isFailure(exit) && !Exit.isInterrupted(exit)) {
            log.warn('EnrichMailbox failed', { cause: exit.cause });
          }
        },
      },
    );
    cancelRef.current = () => cancel();
  }, [invoker, mailbox, space.id, refreshFacts]);

  const handleStop = useCallback(() => {
    cancelRef.current?.();
  }, []);

  // Distinct fact sources = messages that have produced facts (a live "processed" proxy).
  const processedCount = new Set(facts.map((fact) => fact.attribution.source)).size;
  const factsCount = facts.length;

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleReset}>Reset store</Toolbar.Button>
          <Toolbar.Button onClick={handleResetCursor} disabled={!feed || enriching}>
            Reset cursor
          </Toolbar.Button>
          <Toolbar.Button onClick={handleResetFactStore} disabled={enriching}>
            Reset facts
          </Toolbar.Button>
          {enriching ? (
            <Toolbar.Button onClick={handleStop}>Stop</Toolbar.Button>
          ) : (
            <Toolbar.Button onClick={handleEnrich} disabled={!mailbox}>
              Enrich
            </Toolbar.Button>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm'>
        <JsonHighlighter data={{ identity: identity?.identityKey.truncate(), processedCount, factsCount }} />
      </Panel.Content>
    </Panel.Root>
  );
};

//
// Surfaces + plugin
//

/**
 * Resolves the active space at the surface boundary and mounts the module with it, so module bodies
 * never call hooks conditionally — mirrors the `useActiveSpace()` pattern used by plugin surfaces.
 */
const withActiveSpace = (Component: FC<{ space: Space }>) => (): React.ReactNode => {
  const space = useActiveSpace();
  return space ? <Component space={space} /> : null;
};

/** React surfaces for the MailboxSync story columns, one per `Module` role token. */
const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'inbox.controls',
    filter: Surface.makeFilter(Module.Controls),
    component: withActiveSpace(ControlsModule),
  }),
  Surface.create({
    id: 'inbox.mailbox',
    filter: Surface.makeFilter(Module.Mailbox),
    component: withActiveSpace(MailboxModule),
  }),
  Surface.create({
    id: 'inbox.message',
    filter: Surface.makeFilter(Module.Message),
    component: withActiveSpace(MessageModule),
  }),
  Surface.create({
    id: 'inbox.facts',
    filter: Surface.makeFilter(Module.Facts),
    component: withActiveSpace(FactsModule),
  }),
  Surface.create({
    id: 'inbox.connector',
    filter: Surface.makeFilter(Module.Connector),
    component: withActiveSpace(ConnectorModule),
  }),
];

/** Contributes the MailboxSync module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.modules'),
    name: 'Mailbox Sync Story Modules',
  }),
).pipe(
  Plugin.addModule({
    id: 'inbox-story-modules',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => Effect.succeed(Capability.contributes(Capabilities.ReactSurface, moduleSurfaces)),
  }),
  Plugin.make,
);
