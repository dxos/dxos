//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { S } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { getObjectAnnotation, ReferenceAnnotationId, type ObjectAnnotation } from './annotations';
import { type JsonSchemaType } from './types';
import { MutableSchema, StoredSchema } from '../mutable';
import { getTypename, EXPANDO_TYPENAME } from '../object';
import { type WithId, type BaseObject } from '../types';
import { getDescriptionAnnotation, getIdentifierAnnotation, type Annotated } from '@effect/schema/AST';
import { getTitleAnnotation } from '@effect/schema/AST';
import { Option } from 'effect';

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

/**
 * Reference Schema.
 */
//  Naming pattern (Ref$) is borrowed from effect-schema.
export interface Ref$<T extends WithId> extends S.Schema<Ref<T>, EncodedReference> {}

interface RefFn {
  <T extends WithId>(schema: S.Schema<T, any>): Ref$<T>;
}

/**
 * Schema builder for references.
 */
export const Ref: RefFn = <T extends WithId>(schema: S.Schema<T, any>): Ref$<T> => {
  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO schema.');
  }

  return createEchoReferenceSchema(annotation, getSchemaExpectedName(schema.ast));
};

export const RefTypeId: unique symbol = Symbol('@dxos/echo-schema/Ref');

/**
 * Represents materialized reference to a target.
 * This is the data type for the fields marked as ref.
 */
export interface Ref<T> {
  /**
   * Target object DXN.
   */
  get dxn(): DXN;

  /**
   * @returns The reference target.
   * May return `undefined` if the object is not loaded in the working set.
   * Accessing this property, even if it returns `undefined` will trigger the object to be loaded to the working set.
   *
   * @reactive Supports signal subscriptions.
   */
  get target(): T | undefined;

  /**
   * @returns Promise that will resolves with the target object.
   * Will load the object from disk if it is not present in the working set.
   * @throws If the object is not available locally.
   */
  load(): Promise<T>;

  /**
   * @returns Promise that will resolves with the target object or undefined if the object is not loaded locally.
   */
  tryLoad(): Promise<T | undefined>;

  [RefTypeId]: {
    _T: T;
  };
}

const isRef = (obj: any): obj is Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
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
export const createEchoReferenceSchema = (annotation: ObjectAnnotation, schemaName?: string): S.Schema.AnyNoContext => {
  // const typePredicate =
  //   annotation.typename === EXPANDO_TYPENAME
  //     ? () => true
  //     : (obj: BaseObject) => getTypename(obj) === annotation.typename;

  const referenceInfo: JsonSchemaReferenceInfo = {
    schema: {
      $ref: `dxn:type:${annotation.typename}`,
    },
    schemaVersion: annotation.version,
  };
  if (annotation.schemaId) {
    referenceInfo.schemaObject = annotation.schemaId;
  }

  return S.Any.annotations({ jsonSchema: {} }).pipe(
    S.filter(
      (obj) => {
        if (!isRef(obj)) {
          return false;
        }

        // TODO(dmaretskyi): Validate reference target.
        // if (obj instanceof MutableSchema) {
        //   return annotation.typename === StoredSchema.typename;
        // }

        // return typePredicate(obj);
        return true;
      },
      {
        jsonSchema: {
          $id: JSON_SCHEMA_ECHO_REF_ID,
          reference: referenceInfo,
        },
        title: schemaName ? `Reference of ${schemaName}` : 'Reference',
        [ReferenceAnnotationId]: annotation,
      },
    ),
  );
};

const getSchemaExpectedName = (ast: Annotated): string | undefined => {
  return getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => getTitleAnnotation(ast)),
    Option.orElse(() => getDescriptionAnnotation(ast)),
    Option.getOrElse(() => undefined),
  );
};
