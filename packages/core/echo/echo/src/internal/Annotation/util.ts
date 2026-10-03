//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EntityKind } from '../common/types/index.ts';

export interface AnnotationHelper<T> {
  /**
   * Get the annotation value from an Effect schema.
   *
   * Only accepts `Schema.Top` — to read an annotation off a `Type.Type`
   * entity, unwrap it first with `Type.getSchema(entity)`. This keeps the
   * annotation pipeline single-shaped and forces annotations to live on the
   * source schema, not on the post-construction Type entity.
   */
  get: (schema: Schema.Top) => Option.Option<T>;
  /**
   * Get the annotation value from the AST.
   */
  getFromAst: (ast: SchemaAST.AST) => Option.Option<T>;
  /**
   * Set the annotation on an Effect schema.
   *
   * Only accepts `Schema.Top` — annotations must be applied to the
   * source schema BEFORE wrapping it with `Type.makeObject` / `Type.makeRelation`.
   * In a pipe, place every `Annotation.X.set(...)` before the `Type.make...` step.
   */
  set: (value: T) => <S extends Schema.Top>(schema: S) => S;
}

/**
 * Note: only for system annotations.
 */
// TODO(dmaretskyi): Rename to createSystemAnnotationHelper.
// TODO(dmaretskyi): REconcile with Annotation.make.
export const createAnnotationHelper = <T>(id: string): AnnotationHelper<T> => {
  return {
    // Effect 4's own accessor returns `T | undefined`; this helper stays `Option`-shaped because
    // that is DXOS's API and `Option` is unchanged in v4 -- only the boundary needed adapting.
    get: (schema) => Option.fromNullishOr(SchemaAST.getAnnotation<T>(schema.ast, id)),
    getFromAst: (ast) => Option.fromNullishOr(SchemaAST.getAnnotation<T>(ast, id)),
    set:
      (value) =>
      <S extends Schema.Top>(schema: S): S =>
        schema.annotate({ [id]: value }) as S,
  };
};

/**
 * If property is optional returns the nested property, otherwise returns the property.
 */
// TODO(wittjosiah): Is there a way to do this as a generic?
export const unwrapOptional = (property: SchemaAST.PropertySignature) => {
  if (!SchemaAST.isOptional(property.type) || !SchemaAST.isUnion(property.type)) {
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

  const obj: Record<string, unknown> = {
    $id: options.identifier ?? DXN.make(options.typename, options.version),
    entityKind: options.kind,
    version: options.version,
    typename: options.typename,
  };
  if (options.kind === EntityKind.Relation) {
    obj.relationSource = { $ref: options.relationSource };
    obj.relationTarget = { $ref: options.relationTarget };
  }

  return obj;
};
