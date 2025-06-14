//
// Copyright 2025 DXOS.org
//

import * as EchoSchema from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import * as LiveObject from '@dxos/live-object';

export type Any = EchoSchema.AnyEchoObject & EchoSchema.RelationSourceTargetRefs;

export const make = LiveObject.live;

export const isRelation = (value: unknown): value is Any => {
  const kind = (value as any)[EchoSchema.EntityKindPropertyId];
  if (kind === undefined) {
    throw new TypeError('Provided value is not a valid ECHO object or relation');
  }
  return kind === EchoSchema.EntityKind.Relation;
};

/**
 * @returns Relation source.
 * @throws If the object is not a relation.
 */
export const getSource = <T extends Any>(relation: T): EchoSchema.RelationSource<T> => {
  invariant(isRelation(relation));
  const obj = relation[EchoSchema.RelationSourceId];
  invariant(obj !== undefined, 'Invalid relation.');
  return obj;
};

/**
 * @returns Relation target.
 * @throws If the object is not a relation.
 */
export const getTarget = <T extends Any>(relation: T): EchoSchema.RelationTarget<T> => {
  invariant(isRelation(relation));
  const obj = relation[EchoSchema.RelationTargetId];
  invariant(obj !== undefined, 'Invalid relation.');
  return obj;
};
