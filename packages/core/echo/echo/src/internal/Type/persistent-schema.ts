//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import { IconAnnotation } from '../Annotation';
import { LabelAnnotation, TypenameSchema, VersionSchema } from '../Annotation';
import { EntityKind, KindId, SchemaKindId, StaticTypeSchemaSlot } from '../common/types';
import { EchoTypeKindSchema } from '../Entity';
import { JsonSchemaType } from '../JsonSchema';

/**
 * Raw struct backing {@link PersistentType}. Exposed only so `PersistentType`
 * (the TS type) can derive its data fields via `Schema.Schema.Type<typeof ...>`;
 * runtime callers should use {@link PersistentType} (the piped, branded entity).
 */
const PersistentTypeStruct = Schema.Struct({
  name: Schema.optional(Schema.String),
  // Drafts (unnamed dynamic types) carry no typename until they're given one.
  typename: Schema.optional(TypenameSchema),
  // Drafts default to '0.0.0'; persisted types may carry a base-version+heads suffix.
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
});

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const PersistentType = PersistentTypeStruct.pipe(
  EchoTypeKindSchema(DXN.make('org.dxos.type.schema', '0.1.0')),
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--database--regular',
    hue: 'green',
  }),
);

/**
 * Persistent representation of a schema — the runtime shape that
 * `db.add(Type.makeObjectFromJsonSchema(...))` / `db.schemaRegistry.register([...])` produces
 * and `Filter.type(Type.Type).run()` returns.
 *
 * Structurally identical to a static `Type.Type` entity: the entity-handler's
 * `get` trap exposes `[SchemaKindId]` from `system.schemaKind` and rebuilds
 * `[StaticTypeSchemaSlot]` lazily from `jsonSchema`, so a persisted instance
 * satisfies the public `Type<A>` interface without casting.
 */
export type PersistentType = Schema.Schema.Type<typeof PersistentTypeStruct> & {
  /** Object identifier — injected by `EchoTypeKindSchema` and stamped at construction. */
  readonly id: string;
  /** Entity-kind discriminator (object/relation/type) carried on every entity instance. */
  readonly [KindId]: EntityKind.Type;
  /** Kind of schema described by this meta-instance — always `EntityKind.Type` for `Type.Type` itself. */
  readonly [SchemaKindId]: EntityKind.Type;
  /** Effect Schema rebuilt lazily from `jsonSchema`; satisfies `Type.getSchema(...)` without an extra cast. */
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;
};
