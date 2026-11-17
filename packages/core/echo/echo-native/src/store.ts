//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { type Obj } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TypeMetaSchemaDXN, objectStructureFromJson } from '@dxos/echo/internal';
import { type SpaceId } from '@dxos/keys';

// echo-sqlite's query compiler and row types are reused as they are: the engine indexes into the same
// tables, so the same SQL answers queries here.
import { UnsupportedOperationError } from '../../echo-sqlite/src/errors.ts';
import { type StoredEntity } from '../../echo-sqlite/src/object-store.ts';
import { type EntityRecord } from '../../echo-sqlite/src/record.ts';
import { type CompiledChanges } from '../../echo-sqlite/src/sql/changes.ts';
import { type CompiledQuery } from '../../echo-sqlite/src/sql/compile.ts';
import { type Native, type NativeWrite, type WriteResult } from './native.ts';
import { type RowTable } from './rows.ts';

export type Doc = A.Doc<DatabaseDirectory>;

/** Effects of the store never need a service: every call is a synchronous call into the engine. */
type Store<A> = Effect.Effect<A, Error>;

const DOCUMENT_ROWS = `m.queueId = ''`;

const ROW_COLUMNS = `m.objectId AS id, s.snapshot AS body, s.version AS version, m.createdAt, m.updatedAt`;

/**
 * A stored entity read from a row table: fields are decoded on first access, and the body is parsed
 * only when something reads it.
 */
class NativeRow implements StoredEntity {
  readonly #table: RowTable;
  readonly #row: number;
  readonly #columns: ColumnIndex;
  #body: Record<string, unknown> | undefined;

  constructor(table: RowTable, row: number, columns: ColumnIndex) {
    this.#table = table;
    this.#row = row;
    this.#columns = columns;
  }

  #text(column: number): string | undefined {
    const value = this.#table.get(this.#row, column);
    return typeof value === 'string' ? value : undefined;
  }

  #number(column: number): number | undefined {
    const value = this.#table.get(this.#row, column);
    return typeof value === 'number' ? value : undefined;
  }

  get id(): string {
    return this.#text(this.#columns.id) ?? '';
  }

  get spaceId(): string | undefined {
    return this.#text(this.#columns.spaceId);
  }

  get body(): Record<string, unknown> {
    this.#body ??= JSON.parse(this.#text(this.#columns.body) ?? '{}');
    return this.#body ?? {};
  }

  get heads(): readonly string[] | undefined {
    const version = this.#text(this.#columns.version);
    return version ? JSON.parse(version) : undefined;
  }

  get queueId(): string | undefined {
    return this.#text(this.#columns.queueId) || undefined;
  }

  get queueNamespace(): string | undefined {
    return this.#text(this.#columns.queueNamespace) || undefined;
  }

  get createdAt(): number | undefined {
    return this.#number(this.#columns.createdAt);
  }

  get updatedAt(): number | undefined {
    return this.#number(this.#columns.updatedAt);
  }

  get rank(): number | undefined {
    return this.#number(this.#columns.rank);
  }

  get group(): StoredEntity['group'] {
    const key = this.#text(this.#columns.groupKey);
    const ord = this.#number(this.#columns.groupOrd);
    return key !== undefined && ord !== undefined
      ? { key, ord, aggregates: JSON.parse(this.#text(this.#columns.aggregates) ?? '{}') }
      : undefined;
  }
}

type ColumnIndex = Record<
  | 'id'
  | 'spaceId'
  | 'body'
  | 'version'
  | 'queueId'
  | 'queueNamespace'
  | 'createdAt'
  | 'updatedAt'
  | 'rank'
  | 'groupKey'
  | 'groupOrd'
  | 'aggregates',
  number
>;

const rowsOf = (table: RowTable): StoredEntity[] => {
  const columns: ColumnIndex = {
    id: table.column('id'),
    spaceId: table.column('spaceId'),
    body: table.column('body'),
    version: table.column('version'),
    queueId: table.column('queueId'),
    queueNamespace: table.column('queueNamespace'),
    createdAt: table.column('createdAt'),
    updatedAt: table.column('updatedAt'),
    rank: table.column('rank'),
    groupKey: table.column('groupKey'),
    groupOrd: table.column('groupOrd'),
    aggregates: table.column('aggregates'),
  };
  const rows: StoredEntity[] = [];
  for (let row = 0; row < table.rows; row++) {
    rows.push(new NativeRow(table, row, columns));
  }
  return rows;
};

const attempt = <A>(body: () => A): Store<A> =>
  Effect.try({ try: body, catch: (error) => (error instanceof Error ? error : new Error(String(error))) });

const toWrite = (record: EntityRecord & { readonly heads?: readonly string[] }): NativeWrite => ({
  id: record.id,
  structure: objectStructureFromJson(record.body as Obj.JSON, { createdAt: record.createdAt }),
  heads: record.heads,
});

/**
 * The store {@link NativeDatabase} reads and writes through: the shape of echo-sqlite's `ObjectStore`,
 * with every operation one call into the engine.
 */
export class NativeStore {
  readonly #native: Native;
  readonly #handle: number;
  readonly #spaceId: SpaceId;
  /** Objects pulled blocks re-indexed since the last {@link index}. */
  #pulled = new Set<string>();

  constructor(native: Native, handle: number, spaceId: SpaceId) {
    this.#native = native;
    this.#handle = handle;
    this.#spaceId = spaceId;
  }

  get native(): Native {
    return this.#native;
  }

  get handle(): number {
    return this.#handle;
  }

  /** Records objects a pulled batch re-indexed, for the database's next {@link index}. */
  notePulled(ids: Iterable<string>): void {
    for (const id of ids) {
      this.#pulled.add(id);
    }
  }

  #rows(sql: string, params: readonly unknown[]): StoredEntity[] {
    return rowsOf(this.#native.query(this.#handle, sql, params));
  }

  loadTypes(): Store<StoredEntity[]> {
    return attempt(() =>
      this.#rows(
        `SELECT ${ROW_COLUMNS} FROM objectMeta m CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.typeDXN = ? AND m.deleted = 0 AND ${DOCUMENT_ROWS}`,
        [this.#spaceId, TypeMetaSchemaDXN.toString()],
      ),
    );
  }

  loadItem(_feedId: string, _id: string): Store<StoredEntity | undefined> {
    return Effect.succeed(undefined);
  }

  load(id: string): Store<StoredEntity | undefined> {
    return attempt(
      () =>
        this.#rows(
          `SELECT ${ROW_COLUMNS} FROM objectMeta m CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.objectId = ? AND ${DOCUMENT_ROWS}`,
          [this.#spaceId, id],
        )[0],
    );
  }

  query(compiled: CompiledQuery): Store<StoredEntity[]> {
    return attempt(() => this.#rows(compiled.sql, compiled.params));
  }

  queryChanges(compiled: CompiledChanges): Store<Record<string, unknown>[]> {
    return attempt(() => {
      const table = this.#native.query(this.#handle, compiled.sql, compiled.params);
      return compiled.grouped
        ? table.objects().map((row) => JSON.parse(String(row.record)))
        : table.objects().map((row) => ({
            key: row.hash,
            source: 'document',
            time: row.time,
            actor: row.actor,
            seq: row.seq,
            ops: row.ops,
          }));
    });
  }

  explain(compiled: CompiledQuery): Store<string[]> {
    return attempt(() =>
      this.#native
        .query(this.#handle, `EXPLAIN QUERY PLAN ${compiled.sql}`, compiled.params)
        .objects()
        .map((row) => String(row.detail)),
    );
  }

  write(
    records: readonly (EntityRecord & { readonly heads?: readonly string[] })[],
    purged: readonly string[] = [],
  ): Store<{ results: Map<string, WriteResult>; indexed: Set<string> }> {
    return attempt(() => this.#native.write(this.#handle, records.map(toWrite), purged));
  }

  /** Each engine call is its own transaction, so a batch needs no outer one. */
  transaction<A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> {
    return effect;
  }

  edit(
    records: readonly (EntityRecord & { readonly heads?: readonly string[] })[],
  ): Map<string, WriteResult> | undefined {
    return this.#native.edit(this.#handle, records.map(toWrite));
  }

  /** A copy of an object's document for history reads: the engine holds the live one. */
  peekDocument(id: string): Doc | undefined {
    const bytes = this.#native.document(this.#handle, id);
    return bytes ? A.load<DatabaseDirectory>(bytes) : undefined;
  }

  /** What pulled blocks indexed since the last call; local writes index as they are written. */
  index(): Store<Set<string>> {
    return Effect.sync(() => {
      const indexed = this.#pulled;
      this.#pulled = new Set();
      return indexed;
    });
  }

  takeMerged(): Set<string> {
    return new Set();
  }

  redirects(): Store<Map<string, string>> {
    return attempt(
      () =>
        new Map(
          this.#native
            .query(this.#handle, 'SELECT fromId, toId FROM echo_sqlite_redirects WHERE spaceId = ?', [this.#spaceId])
            .objects()
            .map((row) => [String(row.fromId), String(row.toId)]),
        ),
    );
  }

  mergeRecord(_id: string): Store<{ mergedInto?: string; mergedFrom: string[] }> {
    return Effect.succeed({ mergedFrom: [] });
  }

  feedOptions(): Store<Map<string, never>> {
    return Effect.succeed(new Map());
  }

  appendItems(_feedId: string, _namespace: string, _items: readonly Record<string, unknown>[]): Store<void> {
    return Effect.fail(new UnsupportedOperationError('feed items'));
  }

  itemCounts(_namespace: string): Store<{ blocksToPush: number; totalBlocks: number }> {
    return Effect.succeed({ blocksToPush: 0, totalBlocks: 0 });
  }

  invalidate(ids: Iterable<string>): void {
    this.#native.invalidate(this.#handle, [...ids]);
  }

  versionsOf(key: string): Store<string[]> {
    return attempt(() =>
      this.#native
        .query(
          this.#handle,
          `SELECT DISTINCT json_extract(s.snapshot, '$."@meta".version') AS version FROM objectMeta m
CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND json_extract(s.snapshot, '$."@meta".key') = ?`,
          [this.#spaceId, key],
        )
        .objects()
        .flatMap((row) => (typeof row.version === 'string' ? [row.version] : [])),
    );
  }

  /** One connection per process writes a file here, so there is no other writer's log to follow. */
  logChanges(_ids: Iterable<string>): Store<void> {
    return Effect.void;
  }

  readChanges(_afterId?: number): Store<{ lastId: number; ids: Set<string> }> {
    return Effect.succeed({ lastId: 0, ids: new Set() });
  }

  dataVersion(): Store<number> {
    return Effect.succeed(0);
  }

  holdSyncLease(_holder: string, _ttl: number): Store<boolean> {
    return Effect.succeed(true);
  }

  releaseSyncLease(_holder: string): Store<void> {
    return Effect.void;
  }

  compactDocuments(): Store<number> {
    return Effect.succeed(0);
  }

  deletedIds(): Store<string[]> {
    return attempt(() =>
      this.#native
        .query(
          this.#handle,
          `WITH RECURSIVE gone(id) AS (
  SELECT m.objectId FROM objectMeta m WHERE m.spaceId = ?1 AND m.deleted = 1 AND ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.parentId = g.id WHERE ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.sourceId = g.id WHERE ${DOCUMENT_ROWS}
  UNION
  SELECT m.objectId FROM gone g CROSS JOIN objectMeta m ON m.spaceId = ?1 AND m.targetId = g.id WHERE ${DOCUMENT_ROWS}
)
SELECT id FROM gone`,
          [this.#spaceId],
        )
        .objects()
        .map((row) => String(row.id)),
    );
  }

  counts(): Store<{ alive: number; deleted: number }> {
    return attempt(() => {
      const [row] = this.#native
        .query(
          this.#handle,
          `SELECT COALESCE(SUM(m.deleted = 0), 0) AS alive, COALESCE(SUM(m.deleted = 1), 0) AS deleted
FROM objectMeta m WHERE m.spaceId = ? AND ${DOCUMENT_ROWS}`,
          [this.#spaceId],
        )
        .objects();
      return { alive: Number(row?.alive ?? 0), deleted: Number(row?.deleted ?? 0) };
    });
  }
}
