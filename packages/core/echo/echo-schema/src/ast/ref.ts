//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { S } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { type ObjectAnnotation, getObjectAnnotation, ReferenceAnnotationId, type JsonSchemaType } from '.';
import { MutableSchema, StoredSchema } from '../mutable';
import { EXPANDO_TYPENAME } from '../object/expando';
import { type WithId, type Ref, getTypename } from '../types';

/**
 * The `$id` field for an ECHO reference schema.
 */
export const JSON_SCHEMA_ECHO_REF_ID = '/schemas/echo/ref';

// TODO(burdon): Define return type.
export const getSchemaReference = (property: JsonSchemaType): { typename: string } | undefined => {
  const { $id, reference: { schema: { $ref } = {} } = {} } = property;
  if ($id === JSON_SCHEMA_ECHO_REF_ID && $ref) {
    return { typename: DXN.parse($ref).toTypename() };
  }
};

export const createSchemaReference = (typename: string): JsonSchemaType => {
  return {
    $id: JSON_SCHEMA_ECHO_REF_ID,
    reference: {
      schema: {
        $ref: DXN.fromTypename(typename).toString(),
      },
    },
  };
};

export interface ref<T extends WithId> extends S.Schema<Ref<T>, EncodedReference> {}

export const ref = <T extends WithId>(schema: S.Schema<T, any>): ref<T> => {
  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO schema.');
  }

  return createEchoReferenceSchema(annotation);
};

/**
 * `reference` field on the schema object.
 */
export type JsonSchemaReferenceInfo = {
  schema: { $ref: string };
  schemaVersion: string;
  schemaObject?: string;
};

/**
 * @internal
 */
// TODO(burdon): Move to json schema and make private?
export const createEchoReferenceSchema = (annotation: ObjectAnnotation): S.Schema<any> => {
  const typePredicate =
    annotation.typename === EXPANDO_TYPENAME ? () => true : (obj: object) => getTypename(obj) === annotation.typename;

  const referenceInfo: JsonSchemaReferenceInfo = {
    schema: {
      $ref: `dxn:type:${annotation.typename}`,
    },
    schemaVersion: annotation.version,
  };
  if (annotation.schemaId) {
    referenceInfo.schemaObject = annotation.schemaId;
  }

  return S.Any.annotations({ jsonSchema: {} })
    .pipe(
      S.filter(
        (obj) => {
          if (obj === undefined) {
            // Unresolved reference.
            return true;
          }

          if (obj instanceof MutableSchema) {
            return annotation.typename === StoredSchema.typename;
          }

          return typePredicate(obj);
        },
        {
          jsonSchema: {
            $id: JSON_SCHEMA_ECHO_REF_ID,
            reference: referenceInfo,
          },
        },
      ),
    )
    .annotations({ [ReferenceAnnotationId]: annotation });
};
