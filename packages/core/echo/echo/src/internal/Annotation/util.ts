//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EntityKind, KindId, StaticTypeSchemaSlot, getStaticTypeSchema } from '../common/types';

export interface AnnotationHelper<T> {
  /**
   * Get the annotation value from a schema or `Type.Type` entity.
   */
  get: (
    schema: Schema.Schema.Any | { readonly [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext },
  ) => Option.Option<T>;
  /**
   * Get the annotation value from the AST.
   */
  getFromAst: (ast: SchemaAST.AST) => Option.Option<T>;
  /**
   * Set the annotation on a schema or `Type.Type` entity. For an entity input
   * the source schema is annotated and the entity's `jsonSchema` rebuilt.
   */
  set: <T2 extends T>(
    value: T2,
  ) => <S extends Schema.Schema.Any | { readonly [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext }>(schema: S) => S;
}

/**
 * Note: only for system annotations.
 */
// TODO(dmaretskyi): Rename to createSystemAnnotationHelper.
export const createAnnotationHelper = <T>(id: symbol): AnnotationHelper<T> => {
  return {
    get: (schema) => {
      // Allow reading annotations off a `Type.Type` entity — extract its
      // source schema from the hidden slot first.
      const slot = getStaticTypeSchema(schema);
      // Persisted Type.Type entities (from db.schemaRegistry.register) carry no
      // StaticTypeSchemaSlot but have a stored jsonSchema; rebuild the Effect
      // Schema lazily via the registered fromJsonSchema impl so we can read
      // its AST annotations.
      const entity = schema as { [KindId]?: unknown; jsonSchema?: unknown };
      const rebuilt =
        slot == null && entity[KindId] === EntityKind.Type && entity.jsonSchema != null
          ? _fromJsonSchema?.(entity.jsonSchema)
          : undefined;
      const ast = slot?.ast ?? rebuilt?.ast ?? (schema as Schema.Schema.Any).ast;
      if (ast == null) {
        return Option.none();
      }
      return SchemaAST.getAnnotation(ast, id);
    },
    getFromAst: (ast) => SchemaAST.getAnnotation(ast, id),
    set:
      <T2 extends T>(value: T2) =>
      <S extends Schema.Schema.Any | { readonly [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext }>(
        schema: S,
      ): S => {
        // `Type.Type` entity input — annotate the underlying source schema and
        // rebuild the entity's `jsonSchema` from it. The entity is frozen so we
        // assemble a fresh object.
        const source = getStaticTypeSchema(schema);
        if (source != null) {
          const annotatedSource = source.annotations({ [id]: value });
          const entityJsonSchema = (schema as { jsonSchema?: unknown }).jsonSchema;
          return Object.freeze({
            ...(schema as object),
            [StaticTypeSchemaSlot]: annotatedSource,
            jsonSchema: jsonSchemaFromSource(annotatedSource, entityJsonSchema),
          }) as unknown as S;
        }
        return (schema as Schema.Schema.Any).annotations({ [id]: value }) as S;
      },
  };
};

let _toJsonSchema: ((schema: Schema.Schema.AnyNoContext) => any) | undefined;
let _fromJsonSchema: ((jsonSchema: any) => Schema.Schema.AnyNoContext) | undefined;

/**
 * Lazy escape hatch: the JsonSchema module registers `toJsonSchema` here so
 * the annotation helper can rebuild `jsonSchema` after annotating the source
 * schema, without taking a hard dependency that would create a cycle.
 */
export const setJsonSchemaSerializer = (impl: (schema: Schema.Schema.AnyNoContext) => any): void => {
  _toJsonSchema = impl;
};

/**
 * Lazy escape hatch: the JsonSchema module registers `toEffectSchema` here so
 * `createAnnotationHelper.get` can read annotations off persisted `Type.Type`
 * entities by rebuilding their Effect Schema from `jsonSchema`.
 */
export const setJsonSchemaDeserializer = (impl: (jsonSchema: any) => Schema.Schema.AnyNoContext): void => {
  _fromJsonSchema = impl;
};

export const jsonSchemaFromSource = (schema: Schema.Schema.AnyNoContext, fallback: any): any => {
  return _toJsonSchema?.(schema) ?? fallback;
};

/**
 * Rebuild the Effect Schema from a persisted `Type.Type` entity's `jsonSchema`
 * using the lazily-registered deserializer. Returns `undefined` if the
 * deserializer hasn't been registered (avoids the import cycle).
 */
export const effectSchemaFromJsonSchema = (jsonSchema: any): Schema.Schema.AnyNoContext | undefined => {
  return _fromJsonSchema?.(jsonSchema);
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
