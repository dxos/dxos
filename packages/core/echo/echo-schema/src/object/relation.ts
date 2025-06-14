//
// Copyright 2025 DXOS.org
//

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationSourceId: unique symbol = Symbol('@dxos/echo-db/RelationSource');

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetId: unique symbol = Symbol('@dxos/echo-db/RelationTarget');

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
 * Property name for relation source when object is serialized to JSON.
 * The value is a DXN of the source object.
 */
export const ATTR_RELATION_SOURCE = '@relationSource';

/**
 * Property name for relation target when object is serialized to JSON.
 * The value is a DXN of the target object.
 */
export const ATTR_RELATION_TARGET = '@relationTarget';
