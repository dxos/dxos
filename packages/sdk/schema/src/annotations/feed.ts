//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { Obj, Ref, Type } from '@dxos/echo';
import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Identifies a schema as an object that owns a canonical feed, naming the property that holds the
 * `Ref<Feed>`. Carrying the property name (rather than a bare `true`) is what lets a generic host
 * resolve the feed without hardcoding `.feed` — see {@link getFeedRef}.
 *
 * Pair it with `Ref.byAnnotation(FeedAnnotationId)` to type a reference to any feed owner.
 */
// TODO(burdon): Should reference the property name?
export const FeedAnnotationId = '@dxos/schema/annotation/Feed';

export type FeedAnnotationValue = {
  /** Name of the property holding the canonical `Ref<Feed>`. */
  property: string;
};

export const FeedAnnotation = createAnnotationHelper<FeedAnnotationValue>(FeedAnnotationId);

/** @returns True if the schema is annotated as a feed owner. */
export const isFeedOwnerSchema = (schema: Type.AnyEntity): boolean =>
  Option.isSome(FeedAnnotation.get(Type.getSchema(schema)));

/**
 * The canonical feed reference of a feed-owning object, resolved through the property named by
 * {@link FeedAnnotation}. Undefined when the object's schema is unannotated or the property is empty.
 */
export const getFeedRef = (obj: Obj.Unknown): Ref.Unknown | undefined => {
  const type = Obj.getType(obj);
  if (!type) {
    return undefined;
  }

  const annotation = FeedAnnotation.get(Type.getSchema(type));
  if (Option.isNone(annotation)) {
    return undefined;
  }

  const candidate: unknown = Obj.getValue(obj, [annotation.value.property]);
  return Ref.isRef(candidate) ? candidate : undefined;
};
