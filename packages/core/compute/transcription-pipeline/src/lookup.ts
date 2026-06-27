//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Query, Ref } from '@dxos/echo';

/** A resolved entity: the matched object's id plus a ref consumers can persist. */
export type EntityMatch = { id: string; ref: Ref.Ref<any> };

/**
 * Resolves a surface noun to a matching object, backed by an index. The pipeline depends only on
 * this function — not on ECHO/the database directly — so the backend (full-text, vector, a remote
 * service, …) is an injected concern. Returns `undefined` when nothing matches.
 */
export type EntityLookup = (noun: string) => Promise<EntityMatch | undefined>;

export type DatabaseLookupOptions = {
  /** Search backend. Full-text matches proper nouns precisely; vector matches semantically. */
  searchKind?: 'full-text' | 'vector';
};

/** An {@link EntityLookup} backed by an ECHO database query (full-text by default). */
export const makeDatabaseLookup =
  (db: Database.Database, { searchKind = 'full-text' }: DatabaseLookupOptions = {}): EntityLookup =>
  async (noun) => {
    const objects = await db.query(Query.select(Filter.text(noun, { type: searchKind }))).run();
    return objects.length > 0 ? { id: objects[0].id.toString(), ref: Ref.make(objects[0]) } : undefined;
  };
