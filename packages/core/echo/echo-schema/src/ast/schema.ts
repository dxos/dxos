//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DXN } from '@dxos/keys';

import { getTypeAnnotation } from './annotations';
import { assertArgument } from '@dxos/invariant';

/**
 * For attaching schema to objects.
 */
export const symbolSchema = Symbol.for('@dxos/schema/Schema');

/**
 * Returns the schema for the given object if one is defined.
 */
// TODO(burdon): Reconcile with `getTypename`.
// TODO(dmaretskyi): For echo objects, this always returns the root schema.
export const getSchema = (obj: unknown | undefined): Schema.Schema.AnyNoContext | undefined => {
  if (!obj) {
    return undefined;
  }

  return (obj as any)[symbolSchema];
};

/**
 * Internal use only.
 */
export const setSchema = (obj: any, schema: Schema.Schema.AnyNoContext) => {
  Object.defineProperty(obj, symbolSchema, {
    value: schema,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

// TODO(dmaretskyi): Unify with `getTypeReference`.
export const getSchemaDXN = (schema: Schema.Schema.All): DXN | undefined => {
  assertArgument(Schema.isSchema(schema), 'schema must be a schema');

  // TODO(dmaretskyi): Add support for dynamic schema.
  const objectAnnotation = getTypeAnnotation(schema);
  if (!objectAnnotation) {
    return undefined;
  }

  return DXN.fromTypenameAndVersion(objectAnnotation.typename, objectAnnotation.version);
};
