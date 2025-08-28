//
// Copyright 2025 DXOS.org
//

import type { RelationSourceId, RelationTargetId } from './model';

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
