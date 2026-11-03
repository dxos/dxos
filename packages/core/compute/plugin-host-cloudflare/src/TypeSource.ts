//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type FunctionWrappingOptions } from '@dxos/compute-runtime';
import { Entity, JsonSchema, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import type { PluginProtocol } from '@dxos/protocols';

/**
 * A type source backed by EDGE's registry of published types: a typename DXN the invocation has not registered is
 * looked up there and rebuilt from the JSON Schema the contributing bundle's catalog carries.
 */
export const fromRegistry =
  (registry: PluginProtocol.TypeRegistry): NonNullable<FunctionWrappingOptions['typeSource']> =>
  async (uri) => {
    if (!DXN.isDXN(uri)) {
      return undefined;
    }
    const record = await registry.resolveType(DXN.getName(uri), DXN.getVersion(uri));
    if (record === undefined) {
      return undefined;
    }
    return fromRecord(record);
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
