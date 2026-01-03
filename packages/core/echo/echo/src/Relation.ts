//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, type ObjectId } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { assumeType } from '@dxos/util';

import * as Entity from './Entity';
import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  type AnyEchoObject,
  EntityKind,
  type InternalObjectProps,
  MetaId,
  type ObjectMeta,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  getObjectDXN,
  getTypeAnnotation,
  makeObject,
} from './internal';
import * as Obj from './Obj';
import * as Type from './Type';

/**
 * Base type for all ECHO relations.
 * @private
 */
interface BaseRelation<Source, Target>
  extends AnyEchoObject,
    Type.Relation.Endpoints<Source, Target>,
    Entity.OfKind<EntityKind.Relation> {}

/**
 * Base type for all Relations objects.
 */
export interface Any extends BaseRelation<Obj.source, Obj.source> {}

export const Any = Schema.Struct({}).pipe(
  Type.Relation({
    typename: 'dxos.org/type/Any',
    version: '0.1.0',
    source: Obj.source,
    target: Obj.source,
  }),
);

/**
 * Relation type with specific source and target types.
 */
export type Relation<Source extends Obj.source, Target extends Obj.source, Props> = BaseRelation<Source, Target> & Props;

export const Source: unique symbol = RelationSourceId as any;
export type Source = typeof Source;

export const Target: unique symbol = RelationTargetId as any;
export type Target = typeof Target;

type MakeProps<T extends Any> = {
  id?: ObjectId;
  [MetaId]?: ObjectMeta;
  [Source]: T[Source];
  [Target]: T[Target];
} & Type.Properties<T>;

/**
 * Creates new relation.
 * @param schema - Relation schema.
 * @param props - Relation properties. Endpoints are passed as [Relation.Source] and [Relation.Target] keys.
 * @param meta - Relation metadata.
 * @returns
 */
// NOTE: Writing the definition this way (with generic over schema) makes typescript perfer to infer the type from the first param (this schema) rather than the second param (the props).
// TODO(dmaretskyi): Move meta into props.
export const make = <S extends Type.Relation.Any>(
  schema: S,
  props: NoInfer<MakeProps<Schema.Schema.Type<S>>>,
  meta?: ObjectMeta,
): Live<Schema.Schema.Type<S> & Entity.OfKind<typeof Entity.Kind.Relation>> => {
  assertArgument(getTypeAnnotation(schema)?.kind === EntityKind.Relation, 'schema', 'Expected a relation schema');

  if (props[MetaId] != null) {
    meta = props[MetaId] as any;
    delete props[MetaId];
  }

  const sourceDXN = getObjectDXN(props[Source]) ?? raise(new Error('Unresolved relation source'));
  const targetDXN = getObjectDXN(props[Target]) ?? raise(new Error('Unresolved relation target'));

  (props as any)[RelationSourceDXNId] = sourceDXN;
  (props as any)[RelationTargetDXNId] = targetDXN;

  return makeObject<Schema.Schema.Type<S>>(schema, props as any, meta);
};

export const isRelation = (value: unknown): value is Any => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (ATTR_RELATION_SOURCE in value || ATTR_RELATION_TARGET in value) {
    return true;
  }

  const kind = (value as any)[Entity.KindId];
  return kind === EntityKind.Relation;
};

/**
 * @returns Relation source DXN.
 * @throws If the object is not a relation.
 */
export const getSourceDXN = (value: Any): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<InternalObjectProps>(value);
  const dxn = (value as InternalObjectProps)[RelationSourceDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation target DXN.
 * @throws If the object is not a relation.
 */
export const getTargetDXN = (value: Any): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<InternalObjectProps>(value);
  const dxn = (value as InternalObjectProps)[RelationTargetDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation source.
 * @throws If the object is not a relation.
 */
export const getSource = <T extends Any>(relation: T): Type.Relation.Source<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<InternalObjectProps>(relation);
  const obj = (relation as InternalObjectProps)[RelationSourceId];
  invariant(obj !== undefined, `Invalid source: ${relation.id}`);
  return obj as Type.Relation.Source<T>;
};

/**
 * @returns Relation target.
 * @throws If the object is not a relation.
 */
export const getTarget = <T extends Any>(relation: T): Type.Relation.Target<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<InternalObjectProps>(relation);
  const obj = (relation as InternalObjectProps)[RelationTargetId];
  invariant(obj !== undefined, `Invalid target: ${relation.id}`);
  return obj as Type.Relation.Target<T>;
};
