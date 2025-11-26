//
// Copyright 2025 DXOS.org
//

import type * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EntityKind } from '../types';

export interface AnnotationHelper<T> {
  get: (schema: Schema.Schema.Any) => Option.Option<T>;
  set: (value: T) => <S extends Schema.Schema.Any>(schema: S) => S;
}

export const createAnnotationHelper = <T>(id: symbol): AnnotationHelper<T> => {
  return {
    get: (schema) => SchemaAST.getAnnotation(schema.ast, id),
    set:
      (value) =>
      <S extends Schema.Schema.Any>(schema: S) =>
        schema.annotations({ [id]: value }) as S,
  };
};

/**
 * If property is optional returns the nested property, otherwise returns the property.
 */
// TODO(wittjosiah): Is there a way to do this as a generic?
export const unwrapOptional = (property: SchemaAST.PropertySignature) => {
  if (!property.isOptional || !SchemaAST.isUnion(property.type)) {
    return property;
  }

  return property.type.types[0];
};

/**
 * @see JSONSchemaAnnotationId
 * @returns JSON-schema annotation so that the schema can be serialized with correct parameters.
 */
// TODO(burdon): Required type.
export const makeTypeJsonSchemaAnnotation = (options: {
  identifier?: string;
  kind: EntityKind;
  typename: string;
  version: string;
  relationSource?: string;
  relationTarget?: string;
}) => {
  assertArgument(!!options.relationSource === (options.kind === EntityKind.Relation), 'relationSource');
  assertArgument(!!options.relationTarget === (options.kind === EntityKind.Relation), 'relationTarget');

  const obj = {
    // TODO(dmaretskyi): Should this include the version?
    $id: options.identifier ?? DXN.fromTypename(options.typename).toString(),
    entityKind: options.kind,
    version: options.version,
    typename: options.typename,
  } as any;
  if (options.kind === EntityKind.Relation) {
    obj.relationSource = { $ref: options.relationSource };
    obj.relationTarget = { $ref: options.relationTarget };
  }

  return obj;
};
