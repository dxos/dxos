import type { Ref } from '../ast/ref';
import type { BaseObject } from '../types';

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
// TODO(dmaretskyi): Seems odd that we're mixing refs here together with relation source and targets.
//                   It's convenient to reuse one mechanism by which two entities relate, but using a ref here is probably wrong.
//                   Consider just exposing the objects directly and ensuring that they are preloaded in the working set together with the ref.
export type RelationSourceTargetRefs = {
  [RelationSourceId]: Ref<any>;
  [RelationTargetId]: Ref<any>;
};
