//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useState } from 'react';

import { EffectEx } from '@dxos/effect';
import { type FactStoreApi, type RDF } from '@dxos/pipeline-rdf';

import { type FactStoreRegistry } from '../../capabilities/fact-store.ts';

// Kept out of `FactsCompanion.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Reads all facts from a store once. Extracted as a plain async function so the read path is
 * unit-testable without provisioning the full capability/render stack. Falls back to an empty list
 * on query failure so the surface never crashes on a malformed store.
 */
export const queryFacts = (store: FactStoreApi): Promise<RDF.Fact[]> =>
  EffectEx.runPromise(store.query({}).pipe(Effect.orElseSucceed((): RDF.Fact[] => [])));

/**
 * Loads the facts for a space from the registry's shared in-memory store, re-querying whenever the
 * store mutates. The in-memory FactStore is not ECHO-reactive, so the registry's `subscribe` (fired
 * after `putFacts`/`clear`) is what keeps the view live as the analysis pipeline writes or a reset clears.
 */
export const useFacts = (registry: FactStoreRegistry, spaceId: string | undefined): RDF.Fact[] => {
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    if (spaceId === undefined) {
      setFacts([]);
      return;
    }

    // Ignore a late resolve after unmount / space change so we never set state on a stale store.
    let cancelled = false;
    const refresh = () =>
      void queryFacts(registry.forSpace(spaceId)).then((result) => {
        if (!cancelled) {
          setFacts(result);
        }
      });

    refresh();
    const unsubscribe = registry.subscribe(spaceId, refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [registry, spaceId]);

  return facts;
};
