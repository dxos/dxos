//
// Copyright 2026 DXOS.org
//

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

/**
 * Reads the story agent's facts from its brain, re-querying after every write (the brain is not
 * ECHO-reactive, so the story brain's `subscribe` is the change signal).
 */
const useFacts = (): RDF.Fact[] => {
  const { store, subscribe } = Hooks.useCapability(StoryBrain);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void EffectEx.runPromise(store.query({})).then((result) => {
        if (!cancelled) {
          setFacts(result);
        }
      });
    refresh();
    const unsubscribe = subscribe(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store, subscribe]);
  return facts;
};

/** The predicates the story agent's brain has learned, re-read after every write. */
const usePredicates = (): RDF.Ontology.Entry[] => {
  const { store, subscribe } = Hooks.useCapability(StoryBrain);
  const [predicates, setPredicates] = useState<RDF.Ontology.Entry[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void EffectEx.runPromise(store.predicates()).then((result) => {
        if (!cancelled) {
          setPredicates(result);
        }
      });
    refresh();
    const unsubscribe = subscribe(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store, subscribe]);
  return predicates;
};

/**
 * RIGHT: the pipeline output. Facts come from the story agent's brain (re-read on write); stats/details
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
  const facts = useFacts();
  const predicates = usePredicates();
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
