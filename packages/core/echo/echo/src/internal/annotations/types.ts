//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Fully qualified globally unique typename.
 * Example: `dxos.org/type/Person`
 */
// TODO(burdon): Reconcile with short DXN format.
// TODO(burdon): Change type => schema throughout.
export const TypenameSchema = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/)).annotations(
  {
    description: 'Fully qualified globally unique typename',
    example: 'dxos.org/type/Person',
  },
);

/**
 * Semantic version format: `major.minor.patch`
 * Example: `1.0.0`
 */
export const VersionSchema = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/)).annotations({
  description: 'Semantic version format: `major.minor.patch`',
  example: '1.0.0',
});

export const TypeMeta = Schema.Struct({
  typename: TypenameSchema,
  version: VersionSchema,
});

export interface TypeMeta extends Schema.Schema.Type<typeof TypeMeta> {}
