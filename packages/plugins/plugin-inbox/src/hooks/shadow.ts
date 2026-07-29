//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * A "shadow" object holds mutable annotations (notes, transcript, …) for an object that cannot itself
 * be mutated in place (e.g. an immutable feed event). It is a db object linked to the annotated object
 * by a `Meta.keys` entry of `{ source: SHADOW_KEY_SOURCE, id: <annotated object URI> }`.
 *
 * Pure (React-free) helpers live here so headless operations can re-anchor shadows; the
 * `useShadowObject` hook builds on them.
 */

/** `Meta.keys[].source` used to link a shadow object to the object (by URI) it annotates. */
export const SHADOW_KEY_SOURCE = 'echo';

/** Finds the shadow object annotating the object at `uri` (matched by its `echo` meta key). */
export const findShadowObject = <T extends Obj.Unknown>(objects: readonly T[], uri: string): T | undefined =>
  objects.find((object) => Obj.getMeta(object).keys?.some((key) => key.source === SHADOW_KEY_SOURCE && key.id === uri));

/**
 * Re-points a shadow object's annotation key from one object URI to another (e.g. when a draft event
 * is synced and replaced by its canonical feed copy, so its notes survive the transition).
 */
export const reanchorShadowObject = (shadow: Obj.Unknown, fromUri: string, toUri: string): void => {
  Obj.update(shadow, (shadow) => {
    const key = Obj.getMeta(shadow).keys?.find((key) => key.source === SHADOW_KEY_SOURCE && key.id === fromUri);
    if (key) {
      key.id = toUri;
    }
  });
};
