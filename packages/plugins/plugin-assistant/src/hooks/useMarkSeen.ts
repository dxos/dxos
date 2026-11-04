//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { type Feed, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { getSeen, markSeen, trackSeen, unseenQuery } from '@dxos/schema';

/** While mounted, keeps the feed's seen cursor at its newest item, which reads the feed for the whole space. */
export const useMarkSeen = (snapshot: Obj.Snapshot<Feed.Feed> | undefined): void => {
  const feed = Obj.getReactiveOrUndefined(snapshot);
  const seen = snapshot && getSeen(snapshot);
  useEffect(() => {
    if (feed && seen === undefined) {
      trackSeen(feed);
    }
  }, [feed, seen]);

  // A transient chat's feed is not stored yet, so it has nothing to query.
  const db = feed && Obj.getDatabase(feed);
  const unseen = useQuery(db, db && seen !== undefined ? unseenQuery(feed, seen) : Query.select(Filter.nothing()));
  const newest = unseen.at(-1);
  useEffect(() => {
    if (feed && newest) {
      markSeen(feed, newest);
    }
  }, [feed, newest]);
};
