//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Trace } from '@dxos/compute';
import { type Database, Filter, Query } from '@dxos/echo';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { EID } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';

import { type Routine } from '#types';

import { groupIntoRuns, type RoutineRun } from './runs';

/**
 * Returns the execution history for a routine.
 *
 * Reads from the per-space trace feed and filters to messages whose
 * `meta.trigger` ref matches one of the routine's triggers.
 */
export const useRoutineHistory = (db: Database.Database | undefined, routine: Routine.Routine): RoutineRun[] => {
  const [traceFeed] = useQuery(db, FeedTraceSink.query);

  const messages = useQuery(
    db,
    traceFeed ? Query.select(Filter.type(Trace.Message)).from(traceFeed) : Query.select(Filter.nothing()),
  );

  const triggerEntityIds = useMemo<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const triggerRef of routine.triggers) {
      if (!triggerRef) {
        continue;
      }
      const uri = triggerRef.uri;
      if (!uri) {
        continue;
      }
      const eid = EID.getEntityId(EID.parse(uri));
      if (eid) {
        ids.add(eid);
      }
    }
    return ids;
  }, [routine.triggers]);

  return useMemo(() => groupIntoRuns(messages, triggerEntityIds), [messages, triggerEntityIds]);
};
