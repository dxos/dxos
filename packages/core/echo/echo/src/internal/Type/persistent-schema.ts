//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import { IconAnnotation } from '../Annotation';
import { LabelAnnotation, TypenameSchema, VersionSchema } from '../Annotation';
import { EchoObjectSchema } from '../Entity';
import { JsonSchemaType } from '../JsonSchema';

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const PersistentSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: TypenameSchema,
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
}).pipe(
  EchoObjectSchema(DXN.make('org.dxos.type.schema', '0.1.0')),
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--database--regular',
    hue: 'green',
  }),
);

export interface PersistentSchema extends Schema.Schema.Type<typeof PersistentSchema> {}
