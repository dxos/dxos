//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import { useMemo } from 'react';

import { Trace } from '@dxos/compute';
import { FeedTraceSink } from '@dxos/compute-runtime';
import { Filter, Query } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

const atomEmpty = Atom.make(() => [] as const);

/**
 * Atom of raw trace messages for a space — the input to `buildExecutionGraph`.
 */
export const getTraceMessagesAtom = (space: Space): Atom.Atom<readonly Trace.Message[]> =>
  pipe(
    space.db.query(FeedTraceSink.query).atom,
    Atom.map(
      (feeds) =>
        // Query across ALL trace feeds: writers race on feed creation (the edge's indexer-backed
        // lookup can miss a not-yet-indexed feed and create a duplicate), so a space may hold
        // several trace feeds — reading only one would silently drop the others' events.
        space.db.query(
          feeds.length > 0
            ? Query.type(Trace.Message).from([...feeds])
            : (Query.select(Filter.nothing()) as Query.Query<never>),
        ).atom,
    ),
    (atom) => Atom.make((get) => get(get(atom))),
  );

/**
 * Subscribes to the space invocation trace feed.
 */
export const useTraceMessages = (space?: Space): readonly Trace.Message[] => {
  const atom = useMemo(() => (space ? getTraceMessagesAtom(space) : atomEmpty), [space]);
  return useAtomValue(atom);
};
