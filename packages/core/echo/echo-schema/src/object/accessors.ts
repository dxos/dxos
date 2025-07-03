//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SchemaId } from './model';
import { LabelAnnotationId } from '../ast';

//
// Accessors based on model.
//

/**
 * Returns a DXN for an object or schema.
 * @deprecated Use `Obj.getDXN`.
 */
export const getObjectDXN = (object: any): DXN | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'expected object');
  assumeType<InternalObjectProps>(object);

  // TODO(dmaretskyi): Use SelfDXNId.

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return DXN.fromLocalObjectId(object.id);
};

/**
 * Returns the schema for the given object if one is defined.
 */
// TODO(burdon): Reconcile with `getTypename`.
// TODO(dmaretskyi): For echo objects, this always returns the root schema.
export const getSchema = (obj: unknown | undefined): Schema.Schema.AnyNoContext | undefined => {
  if (obj) {
    return (obj as any)[SchemaId];
  }
};

/**
 * Internal use only.
 */
export const setSchema = (obj: any, schema: Schema.Schema.AnyNoContext) => {
  Object.defineProperty(obj, SchemaId, {
    value: schema,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/**
 * @deprecated Use {@link Obj.getLabel} instead.
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
export const getLabelForObject = (obj: unknown | undefined): string | undefined => {
  const schema = getSchema(obj);
  if (schema) {
    return getLabel(schema, obj);
  }
};

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
export const getLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>): string | undefined => {
  let annotation = schema.ast.annotations[LabelAnnotationId];
  if (!annotation) {
    return undefined;
  }
  if (!Array.isArray(annotation)) {
    annotation = [annotation];
  }

  for (const accessor of annotation as string[]) {
    assertArgument(typeof accessor === 'string', 'Label annotation must be a string or an array of strings');
    const value = getField(object, accessor as JsonPath);
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return value.toString();
      case 'undefined':
      case 'object':
      case 'function':
        continue;
    }
  }

  return undefined;
};
