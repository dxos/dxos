//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(burdon): Create echo-schema Format types.
// TODO(burdon): Reconcile with "short" DXN.
export const TypenameSchema = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));

export const VersionSchema = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/));

export const TypeMeta = Schema.Struct({
  typename: TypenameSchema,
  version: VersionSchema,
});

export interface TypeMeta extends Schema.Schema.Type<typeof TypeMeta> {}
