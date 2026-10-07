//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { FactEntry } from '#types';

/** The facts of the agent's annotation feeds — one feed per source it read — whose pass completed. */
export const useFactEntries = (agent: Agent.Agent): { facts: FactEntry.Recorded[]; sources: number } => {
  const db = Obj.getDatabase(agent);
  // Child-of rather than a `.children()` traversal, which EDGE's query planner cannot run.
  const feedFilter = useMemo(
    () => Filter.and(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY }), Filter.childOf(agent)),
    [agent],
  );
  const results = useQuery(db, feedFilter);
  const feeds = useMemo(() => results.filter(Obj.instanceOf(Feed.Feed)), [results]);
  const [entriesQuery, passesQuery] = useMemo(
    () =>
      feeds.length > 0
        ? [
            Query.select(Filter.type(FactEntry.FactEntry)).from(feeds),
            Query.select(Filter.type(FactEntry.ExtractionPass)).from(feeds),
          ]
        : [Query.select(Filter.nothing()), Query.select(Filter.nothing())],
    [feeds],
  );
  const entries = useQuery(db, entriesQuery);
  const passes = useQuery(db, passesQuery);
  const facts = useMemo(() => FactEntry.completed(entries, passes), [entries, passes]);
  return { facts, sources: feeds.length };
};
