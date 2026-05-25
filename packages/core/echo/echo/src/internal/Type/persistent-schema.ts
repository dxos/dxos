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
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const PersistentSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // Drafts (unnamed dynamic types) carry no typename until they're given one.
  typename: Schema.optional(TypenameSchema),
  // Drafts default to '0.0.0'; persisted types may carry a base-version+heads suffix.
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
}).pipe(
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
export type PersistentSchema = {
  readonly id: string;
  readonly [KindId]: EntityKind.Type;
  readonly [SchemaKindId]: EntityKind.Type;
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;
  readonly name?: string;
  readonly typename?: string;
  readonly version: string;
  readonly jsonSchema: JsonSchemaType;
};
