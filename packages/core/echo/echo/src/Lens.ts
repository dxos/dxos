//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The object lens: one live ECHO object viewed through a second declared type. Both ends are always
// written out, so the target's TypeScript type IS the view's type, and an interface written once
// against the target works for every source that maps to it.
//
// Sibling of the `Panproto` wire lens in `@dxos/echo-panproto`, which instead crosses the
// serialization boundary to a foreign record.

import { get as project } from './internal/lens/codec.ts';
import {
  type Absorb,
  type AnyLens,
  type Codec,
  type Extract,
  type Lens as LensShape,
  LensTypeId,
  type Mapping,
  type Nested,
  type OneWay,
  type Write,
} from './internal/lens/types.ts';
import { applyWrites } from './internal/lens/write.ts';
import type * as Obj from './Obj.ts';
import type * as Type from './Type.ts';

export { type TargetOf, coded, make } from './internal/lens/codec.ts';
export { compose } from './internal/lens/compose.ts';
export { invert } from './internal/lens/invert.ts';
export { findPath, resolveView, versionId } from './internal/lens/path.ts';
export { endpointOf, nameOf } from './internal/lens/identity.ts';
export { LensSet, between, from as lensesFrom, shadow } from './internal/lens/lens-set.ts';
export {
  type Data as VersionData,
  type VersionEdge,
  type VersionLink,
  type VersionPath,
  compareVersions,
  isVersionLens,
  storedVersionEdge,
  typeOfVersion,
  versionEdge,
  versionOf,
  versionPath,
  versionsOf,
} from './internal/lens/versions.ts';
export { of, targetSchema } from './internal/lens/live.ts';
export { applyWrites } from './internal/lens/write.ts';
export { lookup, registerCodec, scale } from './internal/lens/codecs.ts';
export { compatible } from './internal/lens/mapping.ts';
export { type LawCheckResult, type LawViolation, checkLaws, readsOf, sourceFor } from './internal/lens/laws.ts';
export { OverlayAnnotation, getOverlay, getOverlays } from './internal/lens/overlay.ts';
export { Stored, fromStored, isStored, storedPlan, toStored } from './internal/lens/entity.ts';
export {
  type Absorb,
  type Codec,
  type Coverage,
  type Derived,
  type Extract,
  type ExtractShape,
  type LinkShape,
  type MakeOptions,
  type Mapping,
  type Nested,
  type OneWay,
  type OneWaySpec,
  type Plan,
  type SerializedEntry,
  type SerializedPlan,
  type Shape,
  type Write,
} from './internal/lens/types.ts';

/** Whether `value` is a lens. */
export const isLens = (value: unknown): value is Any =>
  typeof value === 'object' && value !== null && LensTypeId in value;

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

/**
 * `Lens.within(property, mapping)` — a struct property mapped by an inner mapping, which resolves as a top-level
 * one does (explicit entry, same-name match, default). `defaults` serve the inner properties one side alone declares.
 */
export const within = <P extends string>(
  property: P,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Nested<Record<P, unknown>> => ({ kind: 'nested', property, shape: 'struct', mapping, defaults });

/** `Lens.each(property, mapping)` — each element of a list of structs mapped by an inner mapping, by position. */
export const each = <P extends string>(
  property: P,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Nested<Record<P, unknown>> => ({ kind: 'nested', property, shape: 'each', mapping, defaults });

/** `Lens.values(property, mapping)` — each value of a record of structs mapped by an inner mapping, by key. */
export const values = <P extends string>(
  property: P,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Nested<Record<P, unknown>> => ({ kind: 'nested', property, shape: 'values', mapping, defaults });

/**
 * One-way built-ins: a target property computed from source properties, stored as data so every device runs
 * it. Read-only in a view; in version documents, edits flow from the older version only.
 */

/** `Lens.concat(properties, separator)` — the present source strings joined. */
export const concat = (properties: readonly string[], separator: string): OneWay => ({
  kind: 'oneWay',
  spec: { fn: 'concat', from: properties, separator },
});

/** `Lens.part(property, separator, index)` — one part of a source string split by `separator`. */
export const part = (property: string, separator: string, index: number): OneWay => ({
  kind: 'oneWay',
  spec: { fn: 'part', from: [property], separator, index },
});

/** `Lens.mapValue(property, table, fallback)` — a source value looked up in a table. */
export const mapValue = (property: string, table: Readonly<Record<string, unknown>>, fallback?: unknown): OneWay => ({
  kind: 'oneWay',
  spec: { fn: 'mapValue', from: [property], table, fallback },
});

/**
 * `Lens.extract(property, Child, mapping)` — the struct `property` moved into a `Child` object of its own,
 * which the target property references. Version documents create the child (with a convergence key, so
 * concurrent creations merge) and keep the struct and the child in sync; a view reads the reference as unset.
 */
export const extract = <P extends string>(
  property: P,
  child: Type.AnyObj,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Extract<Record<P, unknown>> => ({ kind: 'extract', property, shape: 'struct', child, mapping, defaults });

/**
 * `Lens.extractEach(property, Child, mapping)` — each element of the list of structs `property` moved into a
 * `Child` object of its own, which the target property's list of references names in order. An element is
 * identified by its insertion, not its position, so a reorder (a delete and an insert) makes a new object.
 */
export const extractEach = <P extends string>(
  property: P,
  child: Type.AnyObj,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Extract<Record<P, unknown>> => ({ kind: 'extract', property, shape: 'each', child, mapping, defaults });

/**
 * `Lens.absorb(property, Child, mapping)` — the reverse of an extract: the reference `property` to a `Child`
 * object becomes a struct of the newer version, derived from the object's data. Version documents keep the
 * struct and the object in sync; the struct follows the object the older version referenced at its root.
 */
export const absorb = <P extends string>(
  property: P,
  child: Type.AnyObj,
  mapping: Mapping,
  defaults?: Readonly<Record<string, unknown>>,
): Absorb<Record<P, unknown>> => ({ kind: 'absorb', property, child, mapping, defaults });

/** `Lens.constant(value)` — the same value for every object. */
export const constant = (value: unknown): OneWay => ({ kind: 'oneWay', spec: { fn: 'constant', from: [], value } });

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
