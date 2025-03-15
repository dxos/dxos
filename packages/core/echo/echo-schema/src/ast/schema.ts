//
// Copyright 2025 DXOS.org
//

import { type Schema as S } from 'effect';

/**
 * For attaching schema to objects.
 */
export const symbolSchema = Symbol.for('@dxos/schema/Schema');

/**
 * Returns the schema for the given object if one is defined.
 */
// TODO(burdon): Reconcile with `getTypename`.
export const getSchema = (obj: unknown | undefined): S.Schema<any> | undefined => {
  if (obj) {
    return (obj as any)[symbolSchema];
  }

  return undefined;
};

/**
 * Internal use only.
 */
export const setSchema = (obj: any, schema: S.Schema<any>) => {
  Object.defineProperty(obj, symbolSchema, {
    value: schema,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};
