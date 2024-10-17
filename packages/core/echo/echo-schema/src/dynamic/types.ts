//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { getObjectAnnotation } from '../ast';
import { TypedObject } from '../object';
import { requireTypeReference } from '../proxy';

// TODO(burdon): Enforce typename in constructor.
export class StoredSchema extends TypedObject({ typename: 'dxos.org/type/StoredSchema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: S.Any,
}) {}

export type StaticSchema = {
  id?: string;
  typename: string;
  version: string;
  schema: S.Schema<any>;
};

export const makeStaticSchema = (schema: S.Schema<any>): StaticSchema => {
  requireTypeReference(schema);
  const schemaAnnotation = getObjectAnnotation(schema)!;
  return {
    typename: schemaAnnotation.typename,
    version: schemaAnnotation.version,
    schema,
  } satisfies StaticSchema;
};
