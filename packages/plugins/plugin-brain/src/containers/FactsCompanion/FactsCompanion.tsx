//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type FactStoreApi, type RDF } from '@dxos/pipeline-rdf';
import { getSpace } from '@dxos/react-client/echo';
import { FactViewer } from '@dxos/react-ui-fact-viewer';

import { BrainCapabilities, type FactStoreRegistry } from '#types';

export type FactsCompanionProps = {
  subject: Obj.Any;
};

/**
 * Companion surface rendering the semantic facts of the subject's space. Reads the shared per-space
 * {@link FactStoreRegistry} (populated by fact-extraction operations such as plugin-inbox's
 * `EnrichMailbox`) and hands its facts to the presentational {@link FactViewer}. The store is
 * per-space, so the view shows all space facts; subject-scoped filtering by source DXN is roadmap.
 */
export const FactsCompanion = ({ subject }: FactsCompanionProps) => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const spaceId = getSpace(subject)?.id;
  const facts = useFacts(registry, spaceId);
  return <FactViewer facts={facts} />;
};

/**
 * Reads all facts from a store once. Extracted as a plain async function so the read path is
 * unit-testable without provisioning the full capability/render stack. Falls back to an empty list
 * on query failure so the surface never crashes on a malformed store.
 */
export const queryFacts = (store: FactStoreApi): Promise<RDF.Fact[]> =>
  EffectEx.runPromise(store.query({}).pipe(Effect.orElseSucceed((): RDF.Fact[] => [])));

/**
 * Loads the facts for a space from the registry's shared in-memory store.
 *
 * Phase 1: reads once on mount / when the space changes. Deep reactivity (re-query as the pipeline
 * writes) is a follow-up — the in-memory FactStore is not ECHO-reactive.
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
    void queryFacts(registry.forSpace(spaceId)).then((result) => {
      if (!cancelled) {
        setFacts(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [registry, spaceId]);

  return facts;
};

export default FactsCompanion;
