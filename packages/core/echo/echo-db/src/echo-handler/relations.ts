import {
  EntityKind,
  EntityKindPropertyId,
  getEntityKind,
  Ref,
  RelationSourceId,
  RelationTargetId,
  type BaseObject,
  type HasId,
  type RelationSourceTargetRefs,
} from '@dxos/echo-schema';
import type { ReactiveEchoObject } from './create';
import { invariant } from '@dxos/invariant';
import { getSchema, type ReactiveObject } from '@dxos/live-object';
import type { DXN } from '@dxos/keys';

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
export const getSource = (relation: ReactiveEchoObject<any>): Ref<ReactiveEchoObject<any>> => {
  invariant(isRelation(relation));
  const ref = relation[RelationSourceId];
  invariant(Ref.isRef(ref));
  return ref;
};

/**
 * @returns Target ref from a relation.
 * @throws If the object is not a relation.
 */
export const getTarget = (relation: ReactiveEchoObject<any>): Ref<ReactiveEchoObject<any>> => {
  invariant(isRelation(relation));
  const ref = relation[RelationTargetId];
  invariant(Ref.isRef(ref));
  return ref;
};
