//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { S } from '@dxos/effect';

import { EXPANDO_TYPENAME } from './expando';
import { type HasId, type ObjectAnnotation, getObjectAnnotation, ReferenceAnnotationId } from '../ast';
import { DynamicSchema, StoredSchema } from '../dynamic';
import { getTypename, isReactiveObject } from '../proxy';
import { type Ref } from '../types';

export interface ref<T> extends S.Schema<Ref<T>, EncodedReference> {}

export const ref = <T extends HasId>(schema: S.Schema<T, any>): ref<T> => {
  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO object.');
  }

  return createEchoReferenceSchema(annotation);
};

// TODO(burdon): Move to json schema and make private.
export const createEchoReferenceSchema = (annotation: ObjectAnnotation): S.Schema<any> => {
  const typePredicate =
    annotation.typename === EXPANDO_TYPENAME
      ? () => true
      : (obj: object) => getTypename(obj) === (annotation.schemaId ?? annotation.typename);

  return S.Any.pipe(
    S.filter(
      (obj) => {
        if (obj === undefined) {
          // Unresolved reference.
          return true;
        }
        if (obj instanceof DynamicSchema) {
          return annotation.typename === StoredSchema.typename;
        }
        return isReactiveObject(obj) && typePredicate(obj);
      },
      { jsonSchema: {} },
    ),
  ).annotations({ [ReferenceAnnotationId]: annotation });
};
