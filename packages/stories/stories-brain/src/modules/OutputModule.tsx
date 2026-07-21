//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Thread } from '@dxos/pipeline-email';
import { type RDF } from '@dxos/pipeline-rdf';
import { BrainCapabilities } from '@dxos/plugin-brain/types';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';
import { Organization, Person } from '@dxos/types';

import { type EchoObjectItem, OutputPanel } from '../components';
import { usePipelineStory } from './pipeline-context';

/**
 * Reads a space's facts from Brain's shared in-memory `FactStore`, re-querying whenever the store
 * mutates (the store is not ECHO-reactive, so the registry's `subscribe` is the change signal).
 */
const useFacts = (spaceId: string): RDF.Fact[] => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void EffectEx.runPromise(registry.forSpace(spaceId).query({})).then((result) => {
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

/**
 * RIGHT: the pipeline output. Facts come from Brain's per-space `FactStore` (reactive); stats/details
 * are the run's shared state; the live ECHO objects list is space-derived (Person/Organization/Thread).
 */
export const OutputModule = ({ space }: ModuleProps) => {
  const { stats, details } = usePipelineStory();
  const facts = useFacts(space.id);
  const organizations = useQuery(space.db, Query.type(Organization.Organization));
  const people = useQuery(space.db, Query.type(Person.Person));
  const threads = useQuery(space.db, Query.type(Thread));
  const objects = useMemo<EchoObjectItem[]>(
    () => [
      ...organizations.map((org) => ({ id: org.id, typename: 'Organization', label: org.name ?? org.id })),
      ...people.map((person) => ({ id: person.id, typename: 'Person', label: person.fullName ?? person.id })),
      ...threads.map((thread) => ({ id: thread.id, typename: 'Thread', label: thread.subject ?? thread.threadId })),
    ],
    [organizations, people, threads],
  );

  return <OutputPanel facts={facts} objects={objects} stats={stats} details={details} />;
};
