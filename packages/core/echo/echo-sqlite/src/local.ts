//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';

import { type Hypergraph } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from './database.ts';
import { type StoreDriver, makeLocalDriver, runWith } from './store-driver.ts';

const LOCAL_SPACE_DOMAIN = 'dxos.local-database:';

/**
 * The space id under which the local database `name` stores its rows, so reopening a name finds them.
 *
 * Derived synchronously because `Hypergraph.localDatabase` returns at once; names are chosen by the
 * application, not an adversary, so a fast non-cryptographic digest is sufficient. The id carries the
 * local marker (`SpaceId.isLocal`), which is what keeps replicated data from referencing it.
 *
 * @performance O(name length).
 */
export const localSpaceId = (name: string): SpaceId =>
  SpaceId.local(digest(new TextEncoder().encode(LOCAL_SPACE_DOMAIN + name), SpaceId.byteLength));

/**
 * A {@link Hypergraph.LocalDatabaseFactory} whose databases store through `driverFor`, which may run
 * in this process or across an RPC boundary.
 */
export const makeLocalDatabaseFactory =
  (driverFor: (spaceId: SpaceId) => StoreDriver): Hypergraph.LocalDatabaseFactory =>
  (name, { types, graph }) => {
    const spaceId = localSpaceId(name);
    return SqliteDatabase.make({ spaceId, types, graph, driver: driverFor(spaceId) });
  };

/**
 * A {@link Hypergraph.LocalDatabaseFactory} over the SQL client in context; every local database shares
 * its file, separated by space id.
 */
export const localDatabaseFactory: Effect.Effect<Hypergraph.LocalDatabaseFactory, never, SqlClient.SqlClient> =
  Effect.map(Effect.context<SqlClient.SqlClient>(), (context) => {
    const run = runWith(context);
    return makeLocalDatabaseFactory((spaceId) => makeLocalDriver(spaceId, run));
  });

/**
 * Independent 32-bit FNV-1a lanes, each seeded differently and finalized with the murmur3 mixer.
 */
const digest = (bytes: Uint8Array, length: number): Uint8Array => {
  const out = new Uint8Array(length);
  const view = new DataView(out.buffer);
  for (let lane = 0; lane < length / 4; lane++) {
    let hash = (0x811c9dc5 ^ Math.imul(lane + 1, 0x9e3779b1)) >>> 0;
    for (const byte of bytes) {
      hash = Math.imul(hash ^ byte, 0x01000193);
    }
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    view.setUint32(lane * 4, (hash ^ (hash >>> 16)) >>> 0);
  }
  return out;
};
