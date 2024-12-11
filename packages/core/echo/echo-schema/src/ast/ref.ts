//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { S } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { getEchoIdentifierAnnotation, getObjectAnnotation, ReferenceAnnotationId } from './annotations';
import { type JsonSchemaType } from './json-schema-type';
import { EchoSchema, StoredSchema } from '../schema';
import { EXPANDO_TYPENAME, getTypename } from '../object';
import { type Ref, type WithId } from '../types';

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

  return createEchoReferenceSchema(getEchoIdentifierAnnotation(schema), annotation.typename, annotation.version);
};

/**
 * `reference` field on the schema object.
 */
export type JsonSchemaReferenceInfo = {
  schema: { $ref: string };
  schemaVersion?: string;
};

/**
 * @internal
 */
// TODO(burdon): Move to json schema and make private?
export const createEchoReferenceSchema = (
  echoId: string | undefined,
  typename: string | undefined,
  version: string | undefined,
): S.Schema<any> => {
  if (!echoId && !typename) {
    throw new TypeError('Either echoId or typename must be provided.');
  }

  const referenceInfo: JsonSchemaReferenceInfo = {
    schema: {
      $ref: echoId ?? `dxn:type:${typename}`,
    },
    schemaVersion: version,
  };

  return S.Any.annotations({ jsonSchema: {} })
    .pipe(
      S.filter(
        (obj) => {
          if (obj === undefined) {
            // Unresolved reference.
            return true;
          }

          if (obj instanceof EchoSchema && typename) {
            return typename === StoredSchema.typename;
          }

          // TODO(dmaretskyi): Compare by echoID.
          if (!typename || typename === EXPANDO_TYPENAME) {
            return true;
          }

          return getTypename(obj) === typename;
        },
        {
          jsonSchema: {
            $id: JSON_SCHEMA_ECHO_REF_ID,
            reference: referenceInfo,
          },
        },
      ),
    )
    .annotations({
      // TODO(dmaretskyi): Store target schema echoId.
      [ReferenceAnnotationId]: {
        typename: typename ?? '',
        version,
      },
    });
};
