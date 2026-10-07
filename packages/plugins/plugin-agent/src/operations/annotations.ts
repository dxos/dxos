//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';

import { FactEntry } from '#types';

/** Identifies a source's annotation feed: the source object's id, or the URL of a web page. */
export type AnnotationTarget = { id: string; name: string };

/**
 * The agent's annotation feed for one source, created on first read. Keyed by a foreign key and
 * parented to the agent — filters EDGE's query planner can run, unlike a `.children()` traversal.
 */
export const ensureAnnotationFeed = Effect.fnUntraced(function* (agent: Agent.Agent, { id, name }: AnnotationTarget) {
  const key = { source: FactEntry.ANNOTATIONS_KEY, id };
  const [existing] = yield* Database.query(
    Query.select(Filter.and(Filter.foreignKeys(Feed.Feed, [key]), Filter.childOf(agent))),
  ).run;
  if (existing && Obj.instanceOf(Feed.Feed, existing)) {
    return existing;
  }

  return yield* Database.add(
    Feed.make({
      [Obj.Meta]: { keys: [key] },
      [Obj.Parent]: agent,
      name: `Annotations: ${name}`,
      kind: FactEntry.ANNOTATIONS_KEY,
    }),
  );
});

const annotationFeeds = Database.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run;

/** Every fact of a completed pass in the space's annotation feeds. */
export const queryFacts = Effect.gen(function* () {
  const feeds = yield* annotationFeeds;
  if (feeds.length === 0) {
    return [];
  }

  const entries = yield* Database.query(Query.select(Filter.type(FactEntry.FactEntry)).from(feeds)).run;
  const passes = yield* Database.query(Query.select(Filter.type(FactEntry.ExtractionPass)).from(feeds)).run;
  return FactEntry.completed(entries, passes);
});

/**
 * Removes a fact from the annotation feeds, every copy of it a re-read appended included; returns how
 * many entries were removed. The brain's index drops it on its next rebuild from the feeds.
 */
export const forgetFact = Effect.fnUntraced(function* (factId: string) {
  let removed = 0;
  for (const feed of yield* annotationFeeds) {
    const entries = yield* Feed.query(feed, Filter.foreignKeys(FactEntry.FactEntry, [FactEntry.factKey(factId)])).run;
    if (entries.length > 0) {
      yield* Feed.remove(feed, entries);
      removed += entries.length;
    }
  }
  if (removed > 0) {
    yield* Database.flush();
  }
  return removed;
});
