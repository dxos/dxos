//
// Copyright 2025 DXOS.org
//

import {
  EntityKind,
  EntityKindPropertyId,
  RelationSourceId,
  RelationTargetId,
  type BaseObject,
  type HasId,
  type RelationSourceTargetRefs,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type ReactiveObject } from '@dxos/live-object';

import type { ReactiveEchoObject } from './create';

export type ReactiveEchoRelation<T extends BaseObject> = ReactiveObject<T> & HasId & RelationSourceTargetRefs;

export const isRelation = <T extends BaseObject>(object: ReactiveEchoObject<T>): object is ReactiveEchoRelation<T> => {
  const kind = (object as any)[EntityKindPropertyId];
  if (kind === undefined) {
    throw new TypeError('Provided value is not a valid ECHO object or relation');
  }
  return kind === EntityKind.Relation;
};

/**
 * @returns Source ref from a relation.
 * @throws If the object is not a relation.
 */
export const getSource = (relation: ReactiveEchoObject<any>): ReactiveEchoObject<any> => {
  invariant(isRelation(relation));
  const obj = relation[RelationSourceId];
  invariant(obj !== undefined);
  return obj;
};

/**
 * @returns Target ref from a relation.
 * @throws If the object is not a relation.
 */
export const getTarget = (relation: ReactiveEchoObject<any>): ReactiveEchoObject<any> => {
  invariant(isRelation(relation));
  const obj = relation[RelationTargetId];
  invariant(obj !== undefined);
  return obj;
};
