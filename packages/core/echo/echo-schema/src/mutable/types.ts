//
// Copyright 2024 DXOS.org
//

import { type S } from '@dxos/effect';

import { getObjectAnnotation } from '../ast';
import { requireTypeReference } from '../types';

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
