//
// Copyright 2025 DXOS.org
//

import { type Obj, type Relation } from '@dxos/echo';
import {
  type BaseObject,
  EntityKind,
  EntityKindId,
  RelationSourceId,
  type RelationSourceTargetRefs,
  RelationTargetId,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type Live } from '@dxos/live-object';

import type { AnyLiveObject } from './echo-handler';

/**
 * @deprecated Use {@link @dxos/echo#Relation.Any} instead.
 */
export type AnyLiveRelation<T extends BaseObject> = Live<T> & (Obj.Any | Relation.Any) & RelationSourceTargetRefs;

/**
 * @deprecated Use {@link @dxos/echo#Relation.isRelation} instead.
 */
export const isRelation = <T extends BaseObject>(object: AnyLiveObject<T>): object is AnyLiveRelation<T> => {
  const kind = (object as any)[EntityKindId];
  if (kind === undefined) {
    throw new TypeError('Provided value is not a valid ECHO object or relation');
  }
  return kind === EntityKind.Relation;
};

/**
 * @deprecated Use {@link @dxos/echo#Relation.getSource} instead.
 * @returns Source ref from a relation.
 * @throws If the object is not a relation.
 */
export const getSource = (relation: AnyLiveObject<any>): AnyLiveObject<any> => {
  invariant(isRelation(relation));
  const obj = relation[RelationSourceId];
  invariant(obj !== undefined);
  return obj;
};

/**
 * @deprecated Use {@link @dxos/echo#Relation.getTarget} instead.
 * @returns Target ref from a relation.
 * @throws If the object is not a relation.
 */
export const getTarget = (relation: AnyLiveObject<any>): AnyLiveObject<any> => {
  invariant(isRelation(relation));
  const obj = relation[RelationTargetId];
  invariant(obj !== undefined);
  return obj;
};
