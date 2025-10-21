//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type JsonPath, getField } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { DescriptionAnnotation, LabelAnnotation } from '../ast';

import { type InternalObjectProps, SchemaId, SelfDXNId } from './model';

//
// Accessors based on model.
//

/**
 * Returns a DXN for an object or schema.
 * @deprecated Use `Obj.getDXN`.
 */
export const getObjectDXN = (object: any): DXN | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfDXNId]) {
    invariant(object[SelfDXNId] instanceof DXN, 'Invalid object model: invalid self dxn');
    return object[SelfDXNId];
  }

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
  const annotation = LabelAnnotation.get(schema).pipe(Option.getOrElse(() => ['name']));
  for (const accessor of annotation) {
    assertArgument(
      typeof accessor === 'string',
      'accessor',
      'Label annotation must be a string or an array of strings',
    );
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

/**
 * Sets the label for a given object based on {@link LabelAnnotationId}.
 */
export const setLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>, label: string) => {
  const annotation = LabelAnnotation.get(schema).pipe(
    Option.map((field) => field[0]),
    Option.getOrElse(() => 'name'),
  );
  object[annotation] = label;
};

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
export const getDescription = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
): string | undefined => {
  const accessor = DescriptionAnnotation.get(schema).pipe(Option.getOrElse(() => 'description'));
  assertArgument(typeof accessor === 'string', 'accessor', 'Description annotation must be a string');
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
    default:
      return undefined;
  }
};

/**
 * Sets the description for a given object based on {@link DescriptionAnnotationId}.
 */
export const setDescription = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
  description: string,
) => {
  const accessor = DescriptionAnnotation.get(schema).pipe(Option.getOrElse(() => 'description'));
  object[accessor] = description;
};
