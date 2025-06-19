//
// Copyright 2025 DXOS.org
//

import * as EchoSchema from '@dxos/echo-schema';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import * as LiveObject from '@dxos/live-object';
import { assumeType } from '@dxos/util';

export type Any = EchoSchema.AnyEchoObject & EchoSchema.RelationSourceTargetRefs;

export const Source = EchoSchema.RelationSourceId;
export const Target = EchoSchema.RelationTargetId;

export const make = LiveObject.live;

export const isRelation = (value: unknown): value is Any => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (EchoSchema.ATTR_RELATION_SOURCE in value || EchoSchema.ATTR_RELATION_TARGET in value) {
    return true;
  }

  const kind = (value as any)[EchoSchema.EntityKindId];
  return kind === EchoSchema.EntityKind.Relation;
};

/**
 * @returns Relation source DXN.
 * @throws If the object is not a relation.
 */
export const getSourceDXN = (value: Any): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<EchoSchema.InternalObjectProps>(value);
  const dxn = value[EchoSchema.RelationSourceDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation target DXN.
 * @throws If the object is not a relation.
 */
export const getTargetDXN = (value: Any): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<EchoSchema.InternalObjectProps>(value);
  const dxn = value[EchoSchema.RelationTargetDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation source.
 * @throws If the object is not a relation.
 */
export const getSource = <T extends Any>(relation: T): EchoSchema.RelationSource<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  const obj = relation[EchoSchema.RelationSourceId];
  invariant(obj !== undefined, `Invalid source: ${relation.id}`);
  return obj;
};

/**
 * @returns Relation target.
 * @throws If the object is not a relation.
 */
export const getTarget = <T extends Any>(relation: T): EchoSchema.RelationTarget<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  const obj = relation[EchoSchema.RelationTargetId];
  invariant(obj !== undefined, `Invalid target: ${relation.id}`);
  return obj;
};
