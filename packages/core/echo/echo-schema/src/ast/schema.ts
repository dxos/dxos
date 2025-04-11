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
// TODO(dmaretskyi): For echo objects, this always returns the root schema.
export const getSchema = (obj: unknown | undefined): S.Schema.AnyNoContext | undefined => {
  if (!obj) {
    return undefined;
  }

  return (obj as any)[symbolSchema];
};

/**
 * Internal use only.
 * @internal
 */
export const setSchema = (obj: any, schema: S.Schema.AnyNoContext) => {
  Object.defineProperty(obj, symbolSchema, {
    value: schema,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};
