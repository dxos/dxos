//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, type Entity, Obj } from '@dxos/echo';

//
// Target properties with no counterpart in the source live in the base object's annotation
// dictionary, keyed by lens id then property. They are reactive and replicate like any other field,
// but are NOT queryable or indexed — a field that needs querying belongs in the base type.
//

/** Overlay values for every lens applied to an object: `lensId -> { property -> value }`. */
export const OverlayAnnotation = Annotation.make({
  id: 'org.dxos.annotation.lens.overlay',
  schema: Schema.Record({
    key: Schema.String,
    value: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  }),
});

type Overlays = Record<string, Record<string, unknown>>;

/** Read every overlay value this lens has stored on the object. */
export const getOverlays = (obj: Obj.Unknown | Obj.Snapshot, lens: string): Record<string, unknown> =>
  Option.getOrElse(Annotation.get(obj, OverlayAnnotation), (): Overlays => ({}))[lens] ?? {};

/** Read one overlay value, or `undefined` when unset. */
export const getOverlay = (obj: Obj.Unknown | Obj.Snapshot, lens: string, property: string): unknown =>
  getOverlays(obj, lens)[property];

/**
 * Write one overlay value. Must be called on a mutable entity — i.e. inside `Obj.update` — so a batch
 * of overlay and property writes lands as a single change.
 */
export const setOverlay = (obj: Entity.Mutable<Obj.Unknown>, lens: string, property: string, value: unknown): void => {
  // Read through the mutable draft so a second write in the same transaction sees the first.
  const current = Option.getOrElse(Annotation.get(obj, OverlayAnnotation), (): Overlays => ({}));
  const next: Overlays = { ...current, [lens]: { ...(current[lens] ?? {}) } };
  if (value === undefined) {
    delete next[lens][property];
  } else {
    next[lens][property] = value;
  }
  Annotation.set(obj, OverlayAnnotation, next);
};
