//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IconAnnotation, LabelAnnotation } from '../Annotation';
import { EntityKind, KindId, SchemaKindId, StaticTypeSchemaSlot } from '../common/types';
import { EchoTypeKindSchema, TypeMetaSchemaDXN } from '../Entity';
import { JsonSchemaType } from '../JsonSchema';

/**
 * Raw struct backing {@link TypeSchema}. Exposed only so `TypeSchema`
 * (the TS type) can derive its data fields via `Schema.Schema.Type<typeof ...>`;
 * runtime callers should use {@link TypeSchema} (the piped, branded entity).
 *
 * `typename` and `version` are NOT data fields — they live in `ObjectMeta.key` /
 * `ObjectMeta.version` (the canonical registry-provenance pair, queryable via
 * `Filter.key(...)`). The same `jsonSchema` payload also embeds them so a
 * standalone JSON-Schema export remains self-describing, but the schema-registry
 * reads/writes them through meta.
 */
const TypeSchemaStruct = Schema.Struct({
  name: Schema.optional(Schema.String),
  jsonSchema: JsonSchemaType,
});

/**
 * Persistent representation of a schema.
 */
export const TypeSchema = TypeSchemaStruct.pipe(
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--database--regular',
    hue: 'green',
  }),
  EchoTypeKindSchema(TypeMetaSchemaDXN),
);

/**
 * Persistent representation of a schema — the runtime shape that
 * `db.add(Type.makeObjectFromJsonSchema(...))` produces
 * and `Filter.type(Type.Type).run()` returns.
 *
 * Structurally identical to a static `Type.Type` entity: the entity-handler's
 * `get` trap exposes `[SchemaKindId]` (derived from `system.kind` and
 * `data.jsonSchema.entityKind`) and rebuilds `[StaticTypeSchemaSlot]` lazily
 * from `jsonSchema`, so a persisted instance satisfies the public `Type<A>`
 * interface without casting.
 */
export type TypeSchema = Schema.Schema.Type<typeof TypeSchemaStruct> & {
  /** Object identifier — injected by `EchoTypeKindSchema` and stamped at construction. */
  readonly id: string;
  /** Entity-kind discriminator (object/relation/type) carried on every entity instance. */
  readonly [KindId]: EntityKind.Type;
  /** Kind of schema described by this meta-instance — always `EntityKind.Type` for `Type.Type` itself. */
  readonly [SchemaKindId]: EntityKind.Type;
  /** Effect Schema rebuilt lazily from `jsonSchema`; satisfies `Type.getSchema(...)` without an extra cast. */
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;
};
