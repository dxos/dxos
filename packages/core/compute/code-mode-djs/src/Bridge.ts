//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type BindingsContext, type SandboxOperation, toRefs } from '@dxos/agent-code-mode';
import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { QueryAST } from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId, URI } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  DETACHED_KEY,
  type DetachedValue,
  type Outcome,
  REFERENCE_KEY,
  type Row,
  STORED_KEY,
  type StoredValue,
  type WriteRecord,
  isRecord,
  sole,
  versionOf,
} from './protocol.ts';

/** What one evaluation's bridge answers from: the turn's services, operations and printer. */
export type BridgeContext = BindingsContext & {
  /** The Effect dialect's printer over this context, built once per evaluation. */
  readonly printValues: (...values: unknown[]) => Effect.Effect<void>;
};

/** Counters a test reads to see what crossed the bridge. */
export type BridgeCounters = {
  query: number;
  load: number;
  write: number;
  refresh: number;
  invoke: number;
  tool: number;
  print: number;
};

/**
 * The host's half of the boundary: the calls a session's guest makes, answered from the host's own
 * database and operations. It holds no state of its own beyond the current evaluation's context, so
 * a snapshot taken in one process restores against a bridge made in another.
 */
export class Bridge {
  #context: BridgeContext | undefined;
  readonly counters: BridgeCounters = { query: 0, load: 0, write: 0, refresh: 0, invoke: 0, tool: 0, print: 0 };

  /** Binds the bridge to the evaluation about to run; the guest's calls are answered from it. */
  bind(context: BridgeContext | undefined): void {
    this.#context = context;
  }

  get db(): Database.Database {
    return Context.get(this.#require().runtime, Database.Service).db;
  }

  async query(ast: unknown): Promise<Row[]> {
    this.counters.query++;
    const db = this.db;
    const entities = await db.query(Query.fromAst(toQueryAst(ast))).run();
    return entities.flatMap((entity) => (Entity.isEntity(entity) ? [rowOf(entity)] : []));
  }

  async load(uri: unknown): Promise<Row | null> {
    this.counters.load++;
    if (typeof uri !== 'string' || !URI.isURI(uri)) {
      return null;
    }
    const entity = await loadEntity(this.db, uri);
    return entity ? rowOf(entity) : null;
  }

  async write(records: unknown, durable?: unknown): Promise<Record<string, string>> {
    this.counters.write++;
    const db = this.db;
    const batch = (Array.isArray(records) ? records : []).filter(isWriteRecord);
    // One lookup for the whole batch: a query per record was most of what a write cost.
    const ids = batch.map(({ id }) => id).filter((id) => EntityId.isValid(id));
    const existing = new Map(
      ids.length === 0
        ? []
        : (
            await db
              .query(Query.select(Filter.id(...ids.map((id) => EntityId.make(id)))).options({ deleted: 'include' }))
              .run()
          ).map((entity) => [entity.id, entity] as const),
    );
    const versions: Record<string, string> = {};
    for (const record of batch) {
      const entity = await applyRecord(db, record, existing.get(record.id));
      if (entity) {
        versions[record.id] = rowOf(entity).version;
      }
    }
    // Only the program's own `Database.flush` waits for storage, as it does in-process; the writes
    // the guest makes before a query or an operation only need the host's working set to hold them.
    if (durable === true) {
      await db.flush();
    }
    return versions;
  }

  async refresh(versions: unknown): Promise<{ rows: Row[]; removed: string[] }> {
    this.counters.refresh++;
    const known = isRecord(versions) ? versions : {};
    const ids = Object.keys(known).filter((id) => EntityId.isValid(id));
    if (ids.length === 0) {
      return { rows: [], removed: [] };
    }
    const entities = await this.db.query(Filter.id(...ids.map((id) => EntityId.make(id)))).run();
    const found = new Map(
      entities.flatMap((entity) => (Entity.isEntity(entity) ? [[entity.id, entity] as const] : [])),
    );
    const rows = [...found.values()].map(rowOf).filter((row) => row.version !== known[row.id]);
    return { rows, removed: ids.filter((id) => !found.has(id)) };
  }

  async invoke(key: unknown, input: unknown): Promise<Outcome> {
    this.counters.invoke++;
    const context = this.#require();
    const definition = context.operations.find(
      (operation): operation is SandboxOperation & { definition: Operation.Definition.Any } =>
        operation.definition !== undefined && String(operation.definition.meta.key) === key,
    )?.definition;
    if (definition === undefined) {
      return { ok: false, message: `Unknown operation: ${String(key)}` };
    }
    return this.#outcome(
      Effect.promise(() => decode(input, this.db)).pipe(
        Effect.flatMap((decoded) => Operation.invoke(definition, toRefs(definition.input.ast, decoded))),
        Effect.provide(context.runtime),
      ),
    );
  }

  async tool(name: unknown, input: unknown): Promise<Outcome> {
    this.counters.tool++;
    const operation = this.#require().operations.find((candidate) => !candidate.definition && candidate.name === name);
    if (operation === undefined) {
      return { ok: false, message: `Unknown tool: ${String(name)}` };
    }
    return this.#outcome(
      Effect.promise(() => decode(input, this.db)).pipe(
        // A tool's input is JSON on every path, as the tool path takes it from any caller.
        Effect.flatMap((decoded) => operation.invoke(JSON.parse(JSON.stringify(decoded ?? {})))),
      ),
    );
  }

  async print(values: unknown): Promise<void> {
    this.counters.print++;
    const context = this.#require();
    const decoded = await decode(Array.isArray(values) ? values : [], this.db);
    await EffectEx.runPromise(context.printValues(...(Array.isArray(decoded) ? decoded : [])));
  }

  async #outcome(effect: Effect.Effect<unknown, unknown>): Promise<Outcome> {
    const db = this.db;
    return EffectEx.runPromise(
      effect.pipe(
        Effect.map((value) => encode(value, db)),
        Effect.match({
          onSuccess: (value): Outcome => ({ ok: true, value }),
          onFailure: (error): Outcome => ({ ok: false, message: describe(error) }),
        }),
      ),
    );
  }

  #require(): BridgeContext {
    if (!this.#context) {
      throw new Error('No evaluation is running against this bridge.');
    }
    return this.#context;
  }
}

/** One object as a row: its ECHO JSON and the version the guest compares on refresh. */
export const rowOf = (entity: Entity.Unknown): Row => {
  const json = { ...Entity.toJSON(entity) };
  return { id: entity.id, json, version: versionOf(json) };
};

/** The query AST the guest sent, checked against its schema: it crossed as data. */
const toQueryAst: (ast: unknown) => QueryAST.Query = Schema.decodeUnknownSync(QueryAST.Query);

const isWriteRecord = (value: unknown): value is WriteRecord =>
  isRecord(value) && typeof value.id === 'string' && isRecord(value.json) && typeof value.deleted === 'boolean';

/** An object by URI: by id through the query index when it is local, else through the resolver. */
const loadEntity = async (db: Database.Database, uri: URI.URI): Promise<Entity.Unknown | undefined> => {
  const id = /^echo:\/\/[^/]*\/([0-9A-Z]{26})$/.exec(uri)?.[1];
  if (id !== undefined && EntityId.isValid(id)) {
    const [indexed] = await db.query(Filter.id(EntityId.make(id))).run();
    if (indexed) {
      return indexed;
    }
  }
  try {
    const resolved = await db.graph.createRefResolver({ context: { space: db.spaceId } }).resolveLegacy(uri);
    return Entity.isEntity(resolved) ? resolved : undefined;
  } catch (error) {
    log.info('code-mode-djs: could not load', { uri, error });
    return undefined;
  }
};

const loadById = async (db: Database.Database, id: string): Promise<Entity.Unknown | undefined> => {
  if (!EntityId.isValid(id)) {
    return undefined;
  }
  const [entity] = await db.query(Query.select(Filter.id(EntityId.make(id))).options({ deleted: 'include' })).run();
  return entity;
};

/** Applies one guest record to the host database: field by field on the host's object, or as a new one. */
const applyRecord = async (
  db: Database.Database,
  record: WriteRecord,
  existing: Entity.Unknown | undefined,
): Promise<Entity.Unknown | undefined> => {
  if (record.deleted) {
    if (existing && !Entity.isDeleted(existing)) {
      db.remove(existing);
    }
    return undefined;
  }
  const resolver = db.graph.createRefResolver({ context: { space: db.spaceId } });
  const snapshot = await Obj.fromJSON(record.json, { refResolver: resolver });
  if (existing === undefined) {
    return db.add(create(db, record, snapshot));
  }
  if (Entity.isDeleted(existing)) {
    db.add(existing);
  }
  if (Obj.isObject(existing)) {
    const incoming = dataOf(snapshot);
    Obj.update(existing, (existing) => {
      for (const key of Object.keys(dataOf(existing))) {
        if (!(key in incoming)) {
          Reflect.deleteProperty(existing, key);
        }
      }
      for (const [key, value] of Object.entries(incoming)) {
        if (!sameJson(Reflect.get(existing, key), value)) {
          Reflect.set(existing, key, value);
        }
      }
    });
  }
  return existing;
};

/**
 * A new host object for a record the guest created, under the guest's id so the references the guest
 * already made to it hold. Built with `Obj.make`/`Relation.make` from the host's own type, since a
 * decoded snapshot is not something every database can adopt.
 */
const create = (db: Database.Database, record: WriteRecord, snapshot: Entity.Unknown): Entity.Unknown => {
  const typeUri = record.json['@type'];
  const type = typeof typeUri === 'string' ? db.registry.getByURI(typeUri) : undefined;
  if (!type || !Type.isType(type)) {
    throw new Error(`The sandbox created an object of a type the host does not have: ${String(typeUri)}`);
  }
  const props = { id: record.id, ...dataOf(snapshot) };
  if (Type.isRelation(type) && Relation.isRelation(snapshot)) {
    return Relation.make(type, {
      ...props,
      [Relation.Source]: Relation.getSource(snapshot),
      [Relation.Target]: Relation.getTarget(snapshot),
    });
  }
  if (!Type.isObject(type)) {
    throw new Error(`Not an object type: ${String(typeUri)}`);
  }
  const object = Obj.make(type, props);
  const parent = Obj.isObject(snapshot) ? Obj.getParent(snapshot) : undefined;
  if (parent) {
    Obj.setParent(object, parent);
  }
  return object;
};

/** Top-level keys that describe the instance, not data an update carries. */
const isSystemKey = (key: string) => key === 'id' || key.startsWith('@');

const dataOf = (entity: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(entity).filter(([key]) => !isSystemKey(key)));

/** Unchanged fields are left alone, so a write of a whole object records only what changed. */
const sameJson = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

/** A host value as plain data for the guest: a stored object travels with its row, so the guest hydrates it in place. */
export const encode = (value: unknown, db: Database.Database): unknown => {
  if (Entity.isEntity(value) && !Type.isType(value)) {
    if (Entity.getDatabase(value) !== undefined) {
      const stored: StoredValue = {
        id: value.id,
        uri: Obj.isObject(value) ? Obj.getURI(value) : value.id,
        row: rowOf(value),
      };
      return { [STORED_KEY]: stored };
    }
    const typename = Entity.getTypeURI(value);
    const properties = Object.fromEntries(
      Object.entries(dataOf(Entity.toJSON(value))).map(([key, entry]) => [key, encode(entry, db)]),
    );
    const detached: DetachedValue = { typename: typename ?? '', properties };
    return { [DETACHED_KEY]: detached };
  }
  if (Ref.isRef(value)) {
    return { [REFERENCE_KEY]: value.uri };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry, db));
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, db)]));
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  return typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
};

/** A guest value with every object and reference resolved against the host database. */
export const decode = async (value: unknown, db: Database.Database): Promise<unknown> => {
  if (Array.isArray(value)) {
    const entries: unknown[] = [];
    for (const entry of value) {
      entries.push(await decode(entry, db));
    }
    return entries;
  }
  if (!isRecord(value)) {
    return value;
  }
  const stored = sole(value, STORED_KEY);
  if (isRecord(stored) && typeof stored.id === 'string' && typeof stored.uri === 'string') {
    return (await loadById(db, stored.id)) ?? (URI.isURI(stored.uri) ? await loadEntity(db, stored.uri) : undefined);
  }
  const detached = sole(value, DETACHED_KEY);
  if (isRecord(detached) && typeof detached.typename === 'string' && isRecord(detached.properties)) {
    const properties = await decode(detached.properties, db);
    const type = db.registry.getByURI(detached.typename);
    return type && Type.isType(type) && Type.isObject(type) && isRecord(properties)
      ? Obj.make(type, properties)
      : { '@type': detached.typename, ...(isRecord(properties) ? properties : {}) };
  }
  const reference = sole(value, REFERENCE_KEY);
  if (typeof reference === 'string' && URI.isURI(reference)) {
    return db.makeRef(reference);
  }
  const entries: [string, unknown][] = [];
  for (const [key, entry] of Object.entries(value)) {
    entries.push([key, await decode(entry, db)]);
  }
  return Object.fromEntries(entries);
};

/** What an operation's failure says, for the program that called it. */
const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error);
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : 'Unknown failure.';
};
