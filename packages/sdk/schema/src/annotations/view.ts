//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Obj, type Type, View } from '@dxos/echo';
import { createAnnotationHelper, type AnnotationHelper } from '@dxos/echo/internal';

// TODO(wittjosiah): This won't serialize into echo. Migrate to `Annotation.make` to store in `PropertyMeta`.
/**
 * Property path segments from the Echo object root to a Ref<View> field (e.g. `['view']` or `['spec', 'view']`).
 * A schema may annotate this path while individual instances omit or unset that ref — those objects are treated as non-view holders at runtime until a ref appears.
 */
export type EchoViewRefPath = readonly string[];

export const ViewAnnotationId = Symbol.for('@dxos/schema/annotation/View');

/** Ref-like Echo field to a persisted View document. */
type EchoViewRefLike = { load?: () => Promise<View.View>; target?: View.View };

export type ViewAnnotationModule = AnnotationHelper<EchoViewRefPath> & {
  /**
   * True when schema declares where a View-backed ref may live (`path.length > 0`).
   */
  has: (schema: Type.AnyEntity) => boolean;
  /** Read property path segments until the leaf; returns undefined when a segment is missing. */
  getHolderAtPath: (object: unknown, path: EchoViewRefPath) => unknown;
  /** Whether the object currently has anything view-like at path (hydrated target or loadable ref). */
  hasRefAlongPath: (object: unknown, path: EchoViewRefPath) => boolean;
  /** Synchronously read a resolved View from the holder at path when `target` is already hydrated. */
  tryGetTargetAlongPath: (object: unknown, path: EchoViewRefPath) => View.View | undefined;
  /** Load the Echo View referenced at path via `holder.load()`, when defined. */
  tryLoadAtPath: (object: Obj.Unknown, path: EchoViewRefPath) => Effect.Effect<View.View | undefined, never, never>;
};

const viewAnnotationSchema = createAnnotationHelper<EchoViewRefPath>(ViewAnnotationId);

const getHolderAtPath = (object: unknown, path: EchoViewRefPath): unknown => {
  let current: unknown = object;
  for (const segment of path) {
    if (current == null || typeof current !== 'object' || !(segment in (current as object))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const viewMethods: Omit<ViewAnnotationModule, keyof AnnotationHelper<EchoViewRefPath>> = {
  has(schema: Type.AnyEntity): boolean {
    return viewAnnotationSchema.get(schema).pipe(
      Option.map((path) => path.length > 0),
      Option.getOrElse(() => false),
    );
  },
  getHolderAtPath,
  hasRefAlongPath(object: unknown, path: EchoViewRefPath): boolean {
    const holder = getHolderAtPath(object, path) as EchoViewRefLike | undefined;
    if (holder === undefined || holder === null) {
      return false;
    }
    return holder.target !== undefined || typeof holder.load === 'function';
  },
  tryGetTargetAlongPath(object: unknown, path: EchoViewRefPath): View.View | undefined {
    const holder = getHolderAtPath(object, path) as EchoViewRefLike | undefined;
    return holder?.target;
  },
  tryLoadAtPath(object: Obj.Unknown, path: EchoViewRefPath): Effect.Effect<View.View | undefined, never, never> {
    return Effect.gen(function* () {
      const holder = getHolderAtPath(object, path) as EchoViewRefLike | undefined;
      if (typeof holder?.load !== 'function') {
        return undefined;
      }
      return yield* Effect.promise(() => holder.load!() as Promise<View.View>);
    });
  },
};

/** View schema annotation (`get`/`set`/`getFromAst`) plus path traversal helpers. */
export const ViewAnnotation = Object.assign(viewAnnotationSchema, viewMethods) as ViewAnnotationModule;
