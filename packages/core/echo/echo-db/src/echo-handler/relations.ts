import { EntityKind, getEntityKind, Ref, type BaseObject, type HasId } from '@dxos/echo-schema';
import type { ReactiveEchoObject } from './create';
import { invariant } from '@dxos/invariant';
import { getSchema, type ReactiveObject } from '@dxos/live-object';
import type { DXN } from '@dxos/keys';

export type ReactiveEchoRelation<T extends BaseObject> = ReactiveObject<T> &
  HasId & {
    [RelationSourceId]: Ref<ReactiveEchoObject<any>>;
    [RelationTargetId]: Ref<ReactiveEchoObject<any>>;
  };

export const isRelation = <T extends BaseObject>(object: ReactiveEchoObject<T>): object is ReactiveEchoRelation<T> => {
  const schema = getSchema(object);
  if (!schema) return false;
  return getEntityKind(schema) === EntityKind.Relation;
};

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Ref<Live<EchoObject<any>>>`
 */
export const RelationSourceId: unique symbol = Symbol('@dxos/echo-db/RelationSource');

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Ref<Live<EchoObject<any>>>`
 */
export const RelationTargetId: unique symbol = Symbol('@dxos/echo-db/RelationSource');

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
