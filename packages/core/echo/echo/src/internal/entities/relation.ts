//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { raise } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import {
  EntityKind,
  type TypeAnnotation,
  TypeAnnotationId,
  type TypeMeta,
  getEntityKind,
  getSchemaTypename,
  getTypeIdentifierAnnotation,
} from '../ast';
import { makeTypeJsonSchemaAnnotation } from '../json-schema';

import { type EchoTypeSchema, makeEchoTypeSchema } from './entity';

/**
 * Property name for relation source when object is serialized to JSON.
 */
export const ATTR_RELATION_SOURCE = '@relationSource';

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationSourceId: unique symbol = Symbol.for('@dxos/echo/RelationSource');

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationSourceDXNId: unique symbol = Symbol.for('@dxos/echo/RelationSourceDXN');

/**
 * Property name for relation target when object is serialized to JSON.
 */
export const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetId: unique symbol = Symbol.for('@dxos/echo/RelationTarget');

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetDXNId: unique symbol = Symbol.for('@dxos/echo/RelationTargetDXN');

/**
 * Source and target props on relations.
 */
// TODO(burdon): any?
export type RelationSourceTargetRefs<Source = any, Target = any> = {
  /**
   * Source ECHO live object.
   */
  [RelationSourceId]: Source;

  /**
   * Target ECHO live object.
   */
  [RelationTargetId]: Target;
};

export type RelationSource<R> = R extends RelationSourceTargetRefs<infer Source, infer _Target> ? Source : never;
export type RelationTarget<R> = R extends RelationSourceTargetRefs<infer _Source, infer Target> ? Target : never;

export type EchoRelationOptions<
  TSource extends Schema.Schema.AnyNoContext,
  TTarget extends Schema.Schema.AnyNoContext,
> = TypeMeta & {
  source: TSource;
  target: TTarget;
};

// TODO(dmaretskyi): Rename EchoRelationSchema (use import namespace).
export const EchoRelation = <Source extends Schema.Schema.AnyNoContext, Target extends Schema.Schema.AnyNoContext>(
  options: EchoRelationOptions<Source, Target>,
) => {
  assertArgument(Schema.isSchema(options.source), 'source');
  assertArgument(Schema.isSchema(options.target), 'target');
  const sourceDXN = getDXNForRelationSchemaRef(options.source);
  const targetDXN = getDXNForRelationSchemaRef(options.target);
  if (getEntityKind(options.source) !== EntityKind.Object) {
    raise(new Error('Source schema must be an echo object schema.'));
  }
  if (getEntityKind(options.target) !== EntityKind.Object) {
    raise(new Error('Target schema must be an echo object schema.'));
  }

  return <Self extends Schema.Schema.Any>(
    self: Self,
  ): EchoTypeSchema<Self, RelationSourceTargetRefs<Schema.Schema.Type<Source>, Schema.Schema.Type<Target>>> => {
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = Schema.extend(Schema.mutable(self), Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: {
        kind: EntityKind.Relation,
        typename: options.typename,
        version: options.version,
        sourceSchema: sourceDXN,
        targetSchema: targetDXN,
      } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?

      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Relation,
        typename: options.typename,
        version: options.version,
        relationSource: sourceDXN,
        relationTarget: targetDXN,
      }),
    });

    return makeEchoTypeSchema<Self>(/* self.fields, */ ast, options.typename, options.version);
  };
};

const getDXNForRelationSchemaRef = (schema: Schema.Schema.Any): string => {
  assertArgument(Schema.isSchema(schema), 'schema');
  const identifier = getTypeIdentifierAnnotation(schema);
  if (identifier) {
    return identifier;
  }

  const typename = getSchemaTypename(schema);
  if (!typename) {
    throw new Error('Schema must have a typename');
  }

  return DXN.fromTypename(typename).toString();
};
