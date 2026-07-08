//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { type FactStoreApi, type RDF } from '@dxos/pipeline-rdf';
import { BrainCapabilities, type FactStoreRegistry } from '@dxos/plugin-brain/types';
import { getSpace } from '@dxos/react-client/echo';
import { FactViewer } from '@dxos/react-ui-fact-viewer';

import { type Mailbox } from '#types';

export type MailboxFactsCompanionProps = {
  mailbox: Mailbox.Mailbox;
};

/**
 * Companion surface rendering the semantic facts extracted for a Mailbox. Reads the shared per-space
 * {@link FactStoreRegistry} (populated by the `EnrichMailbox` operation) and hands its facts to the
 * presentational {@link FactViewer}.
 */
export const MailboxFactsCompanion = ({ mailbox }: MailboxFactsCompanionProps) => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const spaceId = getSpace(mailbox)?.id;
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
