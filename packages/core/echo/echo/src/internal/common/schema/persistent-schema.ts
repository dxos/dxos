//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IconAnnotation } from '../../Annotation';
import { LabelAnnotation, TypenameSchema, VersionSchema } from '../../Annotation';
import { EchoObjectSchema } from '../entities';
import { JsonSchemaType } from '../json-schema';

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
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--brackets-curly--regular',
    hue: 'blue',
  }),
);

export interface PersistentSchema extends Schema.Schema.Type<typeof PersistentSchema> {}
