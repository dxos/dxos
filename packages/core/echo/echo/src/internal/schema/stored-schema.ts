//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(wittjosiah): If this doesn't import from Type, the type isn't portable.
import * as Type from '../../Type';
import { TypenameSchema, VersionSchema } from '../annotations';
import { JsonSchemaType } from '../json-schema';

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const StoredSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: TypenameSchema,
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
  }),
);

export type StoredSchema = Schema.Schema.Type<typeof StoredSchema>;
