//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { FactEntry } from '#types';

/** The entries of the agent's annotation feeds — one per source it read. */
export const useFactEntries = (agent: Agent.Agent): { entries: FactEntry.FactEntry[]; sources: number } => {
  const db = Obj.getDatabase(agent);
  // Child-of rather than a `.children()` traversal, which EDGE's query planner cannot run.
  const feedFilter = useMemo(
    () => Filter.and(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY }), Filter.childOf(agent)),
    [agent],
  );
  const results = useQuery(db, feedFilter);
  const feeds = useMemo(() => results.filter(Obj.instanceOf(Feed.Feed)), [results]);
  const entriesQuery = useMemo(
    () =>
      feeds.length > 0 ? Query.select(Filter.type(FactEntry.FactEntry)).from(feeds) : Query.select(Filter.nothing()),
    [feeds],
  );
  const entries = useQuery(db, entriesQuery);
  return { entries, sources: feeds.length };
};
