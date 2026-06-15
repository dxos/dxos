//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Custom factory used by generic create flows (e.g. the form picker's "Create
 * new" action) when the schema's required structure cannot be produced by
 * `Obj.make(schema, values)` alone — for instance when a type needs a backing
 * object linked by a required ref.
 *
 * The factory receives the values from the inline create form and must return
 * a fully-constructed object that satisfies the schema. It runs in the same
 * process as the form, so closures and references are fine.
 *
 * @example
 * ```ts
 * Subscription.Feed.pipe(
 *   FactoryAnnotation.set((values) => Subscription.makeFeed(values)),
 * );
 * ```
 */
export type FactoryFn = (values: any) => unknown;

export const FactoryAnnotationId = Symbol.for('@dxos/schema/annotation/Factory');
export const FactoryAnnotation = createAnnotationHelper<FactoryFn>(FactoryAnnotationId);
