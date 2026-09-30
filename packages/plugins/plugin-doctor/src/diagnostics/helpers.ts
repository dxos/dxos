//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type Database, Filter, type Hypergraph, Obj, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/halo';
import { isNonNullable } from '@dxos/util';

/**
 * Return the databases of all spaces that are ready to be queried.
 */
export const getReadyDatabases = async ({
  spaces,
  graph,
}: {
  spaces: Space.ServiceApi;
  graph: Hypergraph.Hypergraph;
}): Promise<Database.Database[]> => {
  const infos = await EffectEx.runPromise(
    spaces.spaces.pipe(Stream.runHead, Effect.map(Option.getOrElse((): readonly Space.Info[] => []))),
  );
  return infos
    .filter((info) => info.state === 'ready')
    .map((info) => graph.getDatabase(info.id))
    .filter(isNonNullable);
};

/**
 * Run a query for every object in a database.
 */
export const queryAllObjects = async (db: Database.Database): Promise<Obj.Unknown[]> => {
  const objects = await db.query(Query.select(Filter.everything())).run();
  return objects as Obj.Unknown[];
};

/**
 * Best-effort label for an object (typename + short id).
 */
export const labelObject = (obj: Obj.Unknown): string => {
  const typename = Obj.getTypename(obj) ?? 'unknown';
  return `${typename}:${String((obj as { id?: string }).id ?? '?').slice(0, 8)}`;
};
