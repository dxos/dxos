//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type RDF } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

// Kept out of `FactsCompanion.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** How often the facts are re-read: the brain has no change feed for its facts, as the agent's Knowledge panel polls too. */
export const POLL_MS = 3_000;

/**
 * The facts the space's agents know, re-read every {@link POLL_MS} while mounted. Each read schedules the next once it
 * settles, so a slow read never overlaps a newer one; a failed read keeps the last facts shown.
 */
export const useFacts = (spaceId: string | undefined): RDF.Fact[] => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    setFacts([]);
    if (spaceId === undefined) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      const { data } = await invokePromise(BrainOperation.ListFacts, {}, { spaceId });
      if (cancelled) {
        return;
      }
      if (data) {
        setFacts([...data.facts]);
      }
      timeout = setTimeout(() => void read(), POLL_MS);
    };
    void read();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [invokePromise, spaceId]);

  return facts;
};
