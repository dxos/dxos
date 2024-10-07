//
// Copyright 2024 DXOS.org
//

import { type S } from '@dxos/effect';

import { getEchoObjectAnnotation } from '../ast';
import { requireTypeReference } from '../getter';

export type StaticSchema = {
  id?: string;
  typename: string;
  version: string;
  schema: S.Schema<any>;
};

export const makeStaticSchema = (schema: S.Schema<any>): StaticSchema => {
  requireTypeReference(schema);
  const schemaAnnotation = getEchoObjectAnnotation(schema)!;
  return {
    typename: schemaAnnotation.typename,
    version: schemaAnnotation.version,
    schema,
  } satisfies StaticSchema;
};
