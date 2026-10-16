//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { type Database, Ref } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

// Kept out of `FactsCompanion.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** How often the brains are re-read; a brain has no change feed for its facts. */
const POLL_MS = 3_000;

/** The facts of several brains, each once: two agents reading one mailbox store the same facts. */
export const mergeFacts = (lists: readonly (readonly RDF.Fact[])[]): RDF.Fact[] => [
  ...new Map(lists.flat().map((fact) => [fact.id, fact])).values(),
];

/**
 * The facts in the brains of the space's agents, re-read while mounted. A brain that cannot be read contributes
 * nothing rather than blanking the view.
 *
 * TODO(brain): reads the client's brain; an agent whose chats run on EDGE keeps its facts in EDGE's brain.
 */
export const useFacts = (agents: readonly Agent.Agent[], db: Database.Database | undefined): RDF.Fact[] => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    if (!db || agents.length === 0) {
      setFacts([]);
      return;
    }

    // Ignore a late resolve after unmount / space change so we never set state from a stale read.
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      const results = await Promise.all(
        agents.map((agent) =>
          invokePromise(BrainOperation.ListFacts, { agent: Ref.make(agent) }, { spaceId: db.spaceId }),
        ),
      );
      if (cancelled) {
        return;
      }
      setFacts(mergeFacts(results.map(({ data }) => data?.facts ?? [])));
      timeout = setTimeout(() => void read(), POLL_MS);
    };

    void read();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [agents, db, invokePromise]);

  return facts;
};
