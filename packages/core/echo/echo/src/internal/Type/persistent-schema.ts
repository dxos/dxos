//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

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
  EchoObjectSchema({
    typename: 'org.dxos.type.schema',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--database--regular',
    hue: 'green',
  }),
);

export interface PersistentSchema extends Schema.Schema.Type<typeof PersistentSchema> {}
