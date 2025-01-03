//
// Copyright 2025 DXOS.org
//

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
 * Source and target props on relations.
 */
export type RelationSourceTargetRefs = {
  // TODO(dmaretskyi): Type those better.
  /**
   * Source ECHO live object.
   */
  [RelationSourceId]: any;

  /**
   * Target ECHO live object.
   */
  [RelationTargetId]: any;
};
