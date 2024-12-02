//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { getObjectAnnotation, JsonSchemaType } from '../ast';
import { create } from '../handler';
import { createJsonSchema } from '../json';
import { TypedObject } from '../object';
import { requireTypeReference } from '../proxy';
import { type ReactiveObject } from '../types';

/**
 * Stored representation of a schema.
 */
// TODO(burdon): How to get the S.Schema object that this represents?
export class StoredSchema extends TypedObject({ typename: 'dxos.org/type/Schema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: JsonSchemaType,
}) {}

/**
 * Create ECHO object representing schema.
 */
export const createStoredSchema = ({
  typename,
  version,
  jsonSchema,
}: Pick<StoredSchema, 'typename' | 'version'> &
  Partial<Pick<StoredSchema, 'jsonSchema'>>): ReactiveObject<StoredSchema> => {
  return create(StoredSchema, {
    typename,
    version,
    jsonSchema: jsonSchema ?? createJsonSchema(),
  });
};

/**
 * Wrapper around a schema that is stored in the database (from a type definition) but cannot be modified at runtime.
 * @deprecated
 */
// TODO(burdon): Reconcile with StoredSchema, SchemaMeta.
export type StaticSchema = {
  id?: string;
  typename: string;
  version: string;
  schema: S.Schema<any>;
};

/**
 * @deprecated
 */
export const makeStaticSchema = (schema: S.Schema<any>): StaticSchema => {
  requireTypeReference(schema);
  const schemaAnnotation = getObjectAnnotation(schema)!;
  return {
    typename: schemaAnnotation.typename,
    version: schemaAnnotation.version,
    schema,
  } satisfies StaticSchema;
};
