//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Query } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Thread } from '@dxos/pipeline-email';
import { RDF } from '@dxos/pipeline-rdf';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Organization, Person } from '@dxos/types';

import { type EchoObjectItem, OutputPanel, spaceOntology } from '../components/index.ts';
import { StoryBrain } from '../testing/index.ts';
import { usePipelineStory } from './pipeline-context.ts';

/** How often the brain is re-read: it has no change feed for its facts. */
const POLL_MS = 1_000;

/** Re-reads a value from the story agent's brain every {@link POLL_MS} while mounted. */
const usePolled = <T,>(read: (store: StoryBrain['facts']) => Effect.Effect<T, unknown>, initial: T): T => {
  const { facts: store } = Hooks.useCapability(StoryBrain);
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const result = await EffectEx.runPromise(read(store).pipe(Effect.option));
      if (cancelled) {
        return;
      }
      if (Option.isSome(result)) {
        setValue(result.value);
      }
      timeout = setTimeout(() => void refresh(), POLL_MS);
    };
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [store, read]);
  return value;
};

const NO_FACTS: RDF.Fact[] = [];
const NO_PREDICATES: RDF.Ontology.Entry[] = [];
const readFacts = (store: StoryBrain['facts']) => store.query({});
const readPredicates = (store: StoryBrain['facts']) => store.predicates();

/**
 * RIGHT: the pipeline output. Facts come from the story agent's brain (polled); stats/details
 * are the run's shared state; the live ECHO objects list is space-derived (Person/Organization/Thread).
 */
export const OutputModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <OutputModuleContainer space={space} />;
};

const OutputModuleContainer = ({ space }: { space: Space }) => {
  const { stats, details } = usePipelineStory();
  const facts = usePolled(readFacts, NO_FACTS);
  const predicates = usePolled(readPredicates, NO_PREDICATES);
  const ontology = useMemo(() => spaceOntology(space.id).include(predicates), [space.id, predicates]);
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

  return <OutputPanel facts={facts} ontology={ontology} objects={objects} stats={stats} details={details} />;
};
