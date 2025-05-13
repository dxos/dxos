//
// Copyright 2025 DXOS.org
//

import { EchoRelation, type RelationSourceTargetRefs } from '@dxos/echo-schema';

export const def = EchoRelation;

/**
 * Get relation target type.
 */
export type Target<A> = A extends RelationSourceTargetRefs<infer T, infer _S> ? T : never;

/**
 * Get relation source type.
 */
export type Source<A> = A extends RelationSourceTargetRefs<infer _T, infer S> ? S : never;
