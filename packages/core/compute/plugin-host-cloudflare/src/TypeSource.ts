//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type FunctionWrappingOptions } from '@dxos/compute-runtime/protocol';
import { Entity, JsonSchema, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import type { PluginProtocol } from '@dxos/protocols';

/** The published types an isolate has resolved, by `typename@version`. */
export interface Cache {
  get(key: string): PluginProtocol.TypeRecord | undefined;
  set(key: string, record: PluginProtocol.TypeRecord): void;
}

export type CacheOptions = {
  /** Most records held; past it the least recently used is dropped. */
  readonly capacity?: number;
};

const DEFAULT_CAPACITY = 256;

/**
 * A bounded least-recently-used cache of settled records. It holds values, never promises: a promise settled by a
 * later request than the one that created it is dropped by workerd, so concurrent lookups each ask the registry.
 */
export const makeCache = ({ capacity = DEFAULT_CAPACITY }: CacheOptions = {}): Cache => {
  // A `Map` iterates in insertion order, so re-inserting on read keeps the least recently used first.
  const records = new Map<string, PluginProtocol.TypeRecord>();
  return {
    get: (key) => {
      const record = records.get(key);
      if (record !== undefined) {
        records.delete(key);
        records.set(key, record);
      }
      return record;
    },
    set: (key, record) => {
      records.delete(key);
      records.set(key, record);
      for (const oldest of records.keys()) {
        if (records.size <= capacity) {
          break;
        }
        records.delete(oldest);
      }
    },
  };
};

/** The isolate's cache: every invocation builds its own type source, and a published type does not change under its DXN. */
const isolateCache = makeCache();

/**
 * A type source backed by EDGE's registry of published types: a typename DXN the invocation has not registered is
 * looked up there and rebuilt from the JSON Schema the contributing bundle's catalog carries. A type found is cached
 * for the isolate; an unknown type or a failure is not, since a later publish or retry may answer it.
 */
export const fromRegistry =
  (
    registry: PluginProtocol.TypeRegistry,
    cache: Cache = isolateCache,
  ): NonNullable<FunctionWrappingOptions['typeSource']> =>
  async (uri) => {
    if (!DXN.isDXN(uri)) {
      return undefined;
    }
    const typename = DXN.getName(uri);
    const version = DXN.getVersion(uri);
    const key = `${typename}@${version ?? ''}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      return fromRecord(cached);
    }
    const record = await registry.resolveType(typename, version);
    if (record === undefined) {
      return undefined;
    }
    // Converted first: a record that does not decode stays uncached, so a corrected registry answer resolves later.
    const type = fromRecord(record);
    cache.set(key, record);
    return type;
  };

/**
 * Rebuilds a published type as a static type, the form a plugin registers its own types in: a type entity rebuilt from
 * JSON Schema in memory reports no object or relation kind until it is persisted, and `space.addObject` needs one.
 * A relation's endpoints are any object, since the record names their types only by DXN.
 */
export const fromRecord = (record: PluginProtocol.TypeRecord): Type.AnyEntity => {
  const jsonSchema = Schema.decodeUnknownSync(JsonSchema.JsonSchema)(record.jsonSchema);
  const dxn = DXN.make(record.typename, record.version);
  const schema = JsonSchema.toEffectSchema(jsonSchema);
  return jsonSchema.entityKind === Entity.Kind.Relation
    ? Type.makeRelation(dxn)({ source: Obj.Unknown, target: Obj.Unknown })(schema)
    : Type.makeObject(dxn)(schema);
};
