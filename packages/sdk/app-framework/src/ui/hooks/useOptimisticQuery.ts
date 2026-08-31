//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { type Database, type Filter, type Obj } from '@dxos/echo';

import { Optimistic } from '../../common';

/**
 * The view-specific tail of an optimistic query: extra reactive subscriptions and ordering over
 * the raw result rows, evaluated inside the source atom so its reads re-emit the view.
 */
export type QueryProjection<T> = (get: Atom.AtomContext, rows: readonly T[]) => readonly T[];

/**
 * A live query wrapped in an {@link Optimistic.Overlay}: `rows` re-emits on query changes and on
 * anything `project` reads, while pending overlay entries (registered via `overlay.mutate`)
 * render immediately and retire on the emission that carries their write. The query atom is
 * memoized on `deps` — a fresh source would rebuild the overlay and drop pending entries
 * mid-operation, which is why this exists instead of `useQuery` + local state.
 */
export const useOptimisticQuery = <T extends Obj.Any>(
  db: Database.Database | undefined,
  filter: Filter.Filter<T>,
  project?: QueryProjection<T>,
  deps: readonly unknown[] = [],
): { objects: readonly T[]; overlay: Optimistic.Overlay<T> } => {
  const overlay = useMemo(() => {
    const query = db?.query(filter);
    const source = Atom.make((get): readonly T[] => {
      const objects: readonly T[] = query ? get(query.atom) : [];
      return project ? project(get, objects) : objects;
    });

    return Optimistic.make(source);
    // The filter participates through `deps`: filters are value objects built inline, so the
    // caller names the identities that actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ...deps]);

  return { objects: useAtomValue(overlay.atom), overlay };
};
