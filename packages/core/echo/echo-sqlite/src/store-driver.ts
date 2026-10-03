//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type SpaceId } from '@dxos/keys';

import { ObjectStore, type StoredEntity } from './object-store.ts';
import { type EntityRecord } from './record.ts';
import { type CompiledQuery } from './sql/compile.ts';

/**
 * The storage operations a {@link SqliteDatabase} performs for one space. Each is one round trip when
 * the store sits behind an RPC boundary, so a write batch is one call however many statements it runs.
 */
export interface StoreDriver {
  /** Applies migrations and reads the persisted type rows. */
  open(): Promise<readonly StoredEntity[]>;
  load(id: string): Promise<StoredEntity | undefined>;
  query(compiled: CompiledQuery): Promise<readonly StoredEntity[]>;
  explain(compiled: CompiledQuery): Promise<string[]>;
  write(records: readonly EntityRecord[], purged: readonly string[]): Promise<void>;
  deletedIds(): Promise<string[]>;
  counts(): Promise<{ alive: number; deleted: number }>;
}

export type Run = <A>(effect: Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>) => Promise<A>;

/**
 * A driver that runs {@link ObjectStore} statements in this process.
 */
export const makeLocalDriver = (spaceId: SpaceId, run: Run): StoreDriver => {
  const store = new ObjectStore(spaceId);
  return {
    open: () => run(Effect.andThen(store.migrate(), store.loadTypes())),
    load: (id) => run(store.load(id)),
    query: (compiled) => run(store.query(compiled)),
    explain: (compiled) => run(store.explain(compiled)),
    write: (records, purged) => run(store.write(records, purged)),
    deletedIds: () => run(store.deletedIds()),
    counts: () => run(store.counts()),
  };
};

/**
 * {@link Run} over a captured context that provides the SQL client.
 */
export const runWith = (context: Context.Context<SqlClient.SqlClient>): Run => Effect.runPromiseWith(context);
