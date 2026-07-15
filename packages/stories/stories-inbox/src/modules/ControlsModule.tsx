//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Provider } from '@dxos/ai';
import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { Filter, Ref } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';
import { BrainCapabilities } from '@dxos/plugin-brain/types';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

// Local Ollama model driving `AnalyzeMailbox` fact extraction. Ollama reliably fails structured
// output, so the operation is invoked with `strict: false`.
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

/** Reset / analyze controls plus a JSON status readout — owns the analyze pipeline. */
export const ControlsModule = ({ space }: ModuleProps) => {
  const client = useClient();
  const identity = useIdentity();
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const [registry] = useCapabilities(BrainCapabilities.FactStoreRegistry);
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
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
    if (!analyzing) {
      return;
    }

    const timer = setInterval(() => void refreshFacts(), 500);
    return () => clearInterval(timer);
  }, [analyzing, refreshFacts]);

  const cancelRef = useRef<(() => void) | undefined>(undefined);

  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  const handleResetCursor = useCallback(async () => {
    if (!feed) {
      return;
    }

    const feedRef = Ref.make(feed);
    const cursors = await space.db.query(Filter.type(Cursor.Cursor)).run();
    const existing = cursors.find((cursor) => cursor.spec.kind === 'feed' && cursor.spec.source.uri === feedRef.uri);
    if (existing) {
      space.db.remove(existing);
    }
  }, [space, feed]);

  const handleResetFactStore = useCallback(() => {
    if (!registry) {
      return;
    }

    void EffectEx.runPromise(
      registry
        .forSpace(space.id)
        .clear()
        .pipe(
          Effect.tapError((error) => Effect.sync(() => log.warn('clear failed', { error }))),
          Effect.orElseSucceed(() => undefined),
        ),
    ).then(() => refreshFacts());
  }, [registry, space.id, refreshFacts]);

  const handleRunPipeline = useCallback(() => {
    if (!invoker || !mailbox || cancelRef.current) {
      return;
    }

    setAnalyzing(true);
    const cancel = Effect.runCallback(
      invoker.invoke(
        InboxOperation.AnalyzeMailbox,
        {
          mailbox: Ref.make(mailbox),
          // TODO(burdon): Story config.
          model: OLLAMA_MODEL,
          provider: Provider.ollama.id,
          strict: false,
          pageSize: 1,
        },
        {
          spaceId: space.id,
        },
      ),
      {
        onExit: (exit: Exit.Exit<{ processed: number; facts: number }, Error>) => {
          cancelRef.current = undefined;
          if (mountedRef.current) {
            setAnalyzing(false);
          }
          void refreshFacts();
          if (Exit.isFailure(exit) && !Exit.isInterrupted(exit)) {
            log.warn('pipeline failed', { cause: exit.cause });
          }
        },
      },
    );
    cancelRef.current = () => cancel();
  }, [invoker, mailbox, space.id, refreshFacts]);

  const handleStop = useCallback(() => {
    cancelRef.current?.();
  }, []);

  // TODO(burdon): Can we get the actual progress?
  // Distinct fact sources = messages that have produced facts (a live "processed" proxy).
  const processedCount = new Set(facts.map((fact) => fact.attribution.source)).size;
  const factsCount = facts.length;

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleReset}>Reset store</Toolbar.Button>
          <Toolbar.Button onClick={handleResetFactStore} disabled={analyzing}>
            Reset facts
          </Toolbar.Button>
          <Toolbar.Button onClick={handleResetCursor} disabled={!feed || analyzing}>
            Reset cursor
          </Toolbar.Button>
          {analyzing ? (
            <Toolbar.Button onClick={handleStop}>Stop</Toolbar.Button>
          ) : (
            <Toolbar.Button onClick={handleRunPipeline} disabled={!mailbox}>
              Run
            </Toolbar.Button>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm'>
        <JsonHighlighter
          data={{ identity: identity?.identityKey.truncate(), processed: processedCount, facts: factsCount }}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
