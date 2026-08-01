//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The object lens: one live ECHO object viewed through a second declared type. Both ends are always
// written out, so the target's TypeScript type IS the view's type, and an interface written once
// against the target works for every source that maps to it.
//
// Sibling of the `Panproto` wire lens in this package, which instead crosses the serialization
// boundary to a foreign record. Shaped as a namespace module so promotion into `@dxos/echo` (beside
// `Type`/`View`/`Annotation`) is an import-path change rather than a redesign.

import { type Obj } from '@dxos/echo';

import { get as project } from './lens/codec';
import { type AnyLens, type Codec, type Lens as LensShape, type Write } from './lens/types';
import { applyWrites } from './lens/write';

export { type TargetOf, coded, make } from './lens/codec';
export { of, targetSchema } from './lens/live';
export { applyWrites } from './lens/write';
export { lookup, registerCodec, scale } from './lens/codecs';
export { compatible } from './lens/mapping';
export { type LawCheckResult, type LawViolation, checkLaws, readsOf, sourceFor } from './lens/laws';
export { clear, lensesFor, register, resolve, sourcesFor } from './lens/registry';
export { OverlayAnnotation, getOverlay, getOverlays } from './lens/overlay';
export { Lens as Object, fromObject, toObject } from './lens/entity';
export {
  type Codec,
  type Coverage,
  type Derived,
  type Mapping,
  type Plan,
  type SerializedEntry,
  type Write,
} from './lens/types';

/** A lens binding a source ECHO type to a declared target type. */
export type Lens<S = any, T = any> = LensShape<S, T>;
export type Any = AnyLens;

/** `Lens.from(property, codec)` — rename plus a total value conversion. */
export const from = <P extends string, V>(
  property: P,
  codec: Codec<any, V> | string,
): { kind: 'converted'; property: P; codec: Codec<any, V> | string } => ({
  kind: 'converted' as const,
  property,
  codec,
});

/** `Lens.readOnly(property)` — projected for display, rejected on write. */
export const readOnly = <P extends string>(property: P) => ({ kind: 'readOnly' as const, property });

/** Project the base object into the target shape, as a detached snapshot. */
export const get: <S, T>(obj: Obj.Unknown, lens: Lens<S, T>) => T = project;

/**
 * Write a partial view back to the base object, touching only the properties it names.
 *
 * Partial by design: there is no signature that takes a whole view and writes it wholesale, because
 * that would clobber a concurrent peer's edits to properties this caller never touched.
 */
export const put = <S, T>(obj: Obj.Unknown, lens: Lens<S, T>, view: Partial<T>): void => {
  applyWrites(obj, lens.put(view, obj));
};

/** The writes a partial view would produce, without applying them. */
export const writesFor = <S, T>(obj: Obj.Unknown, lens: Lens<S, T>, view: Partial<T>): readonly Write[] =>
  lens.put(view, obj);

/** How each target property resolved, and which source properties went unread. */
export const coverage = (lens: Any) => {
  if (!lens.plan) {
    throw new TypeError('Lens: a coded lens has no per-property coverage.');
  }
  return lens.plan.coverage;
};
