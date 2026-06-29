//
// Copyright 2026 DXOS.org
//

import { type Quad, Store } from 'n3';

/**
 * In-memory RDF/JS Source (N3 {@link Store}) for browser and test use — no SQLite. Comunica queries
 * it directly via its `match()` interface, so the same engine/query path works as the sqlite source.
 */
export const makeMemorySource = (): Store => new Store();

/** Append reified fact triples to the in-memory store (duplicates are de-duplicated by the Store). */
export const insertQuadsMemory = (store: Store, quads: readonly Quad[]): void => {
  store.addQuads([...quads]);
};
