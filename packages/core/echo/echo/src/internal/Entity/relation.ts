//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { raise } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, type EntityId } from '@dxos/keys';

// Type-only imports (erased at runtime — no import cycle); `internal` may depend
// on the top-level `Obj` / `Type` API at the type level only.
import type * as Obj from '../../Obj';
import type * as Type from '../../Type';
import {
  type TypeAnnotation,
  TypeAnnotationId,
  getEntityKind,
  getSchemaTypename,
  getTypeIdentifierAnnotation,
} from '../Annotation/annotations';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util';
import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  EntityKind,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  type UnknownTypeSchema,
  getStaticTypeSchema,
} from '../common/types';

export {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
};

import { toJsonSchema } from '../JsonSchema';
import { type EchoTypeSchema, makeEchoTypeSchema } from './entity';

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

/**
 * Accepted relation endpoint: an object-kind `Type.Type` entity (slot-backed)
 * or the branded `Obj.Unknown` schema. Source/target are constrained to these
 * — relations only connect object-kind entities.
 */
export type RelationEndpoint = Type.AnyObj | UnknownTypeSchema<any, EntityKind.Object>;

/**
 * Resolves a relation endpoint to the instance type it describes — the source /
 * target instance recorded on the relation's `RelationSourceTargetRefs`.
 */
export type RelationEndpointInstance<S> =
  S extends UnknownTypeSchema<infer A, any> ? A : S extends Type.AnyObj ? Type.InstanceType<S> : unknown;

export type EchoRelationSchemaOptions<TSource extends RelationEndpoint, TTarget extends RelationEndpoint> = {
  dxn: DXN.DXN;
  source: TSource;
  target: TTarget;
  /**
   * Override the entity id stamped on the in-memory `Type.Type` value.
   *
   * Defaults to `EntityId.deterministic(typename, version)` — stable across processes
   * and workerd-safe (no `crypto.getRandomValues()` at module-evaluation time).
   */
  id?: EntityId;
};

/**
 * Relation schema type with kind marker. `SourceInstance` / `TargetInstance`
 * are the resolved endpoint instance types (see {@link RelationEndpointInstance}).
 */
export type EchoRelationSchema<
  Self extends Schema.Schema.Any,
  SourceInstance extends Obj.Unknown,
  TargetInstance extends Obj.Unknown,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> = EchoTypeSchema<Self, RelationSourceTargetRefs<SourceInstance, TargetInstance>, EntityKind.Relation, Fields>;

/**
 * Schema for Relation entity types.
 */
export const EchoRelationSchema = <Source extends RelationEndpoint, Target extends RelationEndpoint>({
  dxn,
  source,
  target,
  id: explicitId,
}: EchoRelationSchemaOptions<Source, Target>) => {
  // `source` / `target` are `Type.Type` entities (slot-backed) or the branded
  // `Obj.Unknown` schema (used directly); resolve each to its Effect Schema for
  // the schema-side machinery (DXN ref + entity-kind checks).
  const sourceSchema = source != null ? (getStaticTypeSchema(source) ?? source) : source;
  const targetSchema = target != null ? (getStaticTypeSchema(target) ?? target) : target;
  assertArgument(Schema.isSchema(sourceSchema), 'source');
  assertArgument(Schema.isSchema(targetSchema), 'target');
  const typename = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  invariant(version, `Type.makeRelation requires a versioned DXN: ${dxn}`);
  const sourceDXN = getDXNForRelationSchemaRef(sourceSchema);
  const targetDXN = getDXNForRelationSchemaRef(targetSchema);
  if (getEntityKind(sourceSchema) !== EntityKind.Object) {
    raise(new Error('Source schema must be an echo object schema.'));
  }
  if (getEntityKind(targetSchema) !== EntityKind.Object) {
    raise(new Error('Target schema must be an echo object schema.'));
  }

  return <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ): EchoRelationSchema<Self, RelationEndpointInstance<Source>, RelationEndpointInstance<Target>, Fields> => {
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // Extract fields from the schema if available (Struct schemas have .fields).
    const fields = ((self as any).fields ?? {}) as Fields;

    const schemaWithId = Schema.extend(self, Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: {
        kind: EntityKind.Relation,
        typename,
        version,
        sourceSchema: sourceDXN,
        targetSchema: targetDXN,
      } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?

      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Relation,
        typename,
        version,
        relationSource: sourceDXN,
        relationTarget: targetDXN,
      }),
    });

    return makeEchoTypeSchema<Self, EntityKind.Relation, Fields>(
      fields,
      ast,
      typename,
      version,
      EntityKind.Relation,
      () => toJsonSchema(Schema.make(ast)),
      explicitId,
    );
  };
};

export const getDXNForRelationSchemaRef = (schema: Schema.Schema.Any): DXN.DXN => {
  assertArgument(Schema.isSchema(schema), 'schema');
  const identifier = getTypeIdentifierAnnotation(schema);
  if (identifier) {
    return DXN.tryMake(identifier) ?? raise(new Error(`Invalid schema identifier: ${identifier}`));
  }

  const typename = getSchemaTypename(schema);
  if (!typename) {
    throw new Error('Schema must have a typename');
  }

  return DXN.make(typename);
};

export const makeRelationType = (options: {
  dxn: DXN.DXN;
  source: Type.AnyObj;
  target: Type.AnyObj;
  schema: Schema.Schema.Any;
  id?: EntityId;
}): Type.RelationClass<unknown, unknown, unknown, unknown, {}> => {
  const type = EchoRelationSchema({
    dxn: options.dxn,
    source: options.source,
    target: options.target,
    id: options.id,
  })(options.schema);
  const constructor = function RelationType() {};
  Object.setPrototypeOf(constructor, type);
  return constructor as any;
};
