//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type EntityId } from '@dxos/keys';

import type * as Obj from '../../Obj.ts';
import type * as Type from '../../Type.ts';
import { type EntityKind, type KindId } from '../common/types/index.ts';

//
// The object lens: one live ECHO object viewed through a second declared type. Unlike the wire lens
// (`Panproto`), which crosses the serialization boundary to a foreign record, nothing here creates a
// second object — reads project the base object and writes invert onto it.
//

/** A path into an ECHO object (the argument to `Obj.getValue`/`Obj.setValue`). */
export type KeyPath = readonly (string | number)[];

/**
 * A total value conversion between a source and a target property. `decode` runs source → target,
 * `encode` target → source; both directions must be defined for the property to be writable.
 */
export type Codec<A = any, B = any> = {
  readonly decode: (value: A) => B;
  readonly encode: (value: B) => A;
};

/**
 * A target property computed from named source properties. `from` declares the read dependency —
 * it is the complement made explicit, and it scopes the reactive subscription — and `put` returns
 * only the source properties that change, so write-minimality is enforced by the signature rather
 * than by convention. Omitting `put` yields a read-only computed property.
 */
export type Derived<S = any, V = any, K extends keyof S = keyof S> = {
  readonly from: readonly K[];
  readonly get: (source: Pick<S, K>) => V;
  readonly put?: (value: V, source: Pick<S, K>) => Partial<S>;
};

/**
 * `Lens.from(property, codec)` — rename plus a total value conversion.
 *
 * The codec is typed on the present value: an unset source property short-circuits to `undefined`
 * without calling it, so an optional target property does not force every codec to handle `undefined`.
 */
export type Converted<S = any, V = any> = {
  readonly kind: 'converted';
  readonly property: keyof S & string;
  /** An inline codec, or the name of one registered via `Lens.registerCodec`. */
  readonly codec: Codec<any, NonNullable<V>> | string;
};

/** `Lens.readOnly(property)` — projected for display, rejected on write. */
export type ReadOnly<S = any> = {
  readonly kind: 'readOnly';
  readonly property: keyof S & string;
};

/** What an extract moves into objects of their own: the struct a property holds, or each element of a list of structs. */
export type ExtractShape = 'struct' | 'each';

/** How a property of one version relates to an object of its own: extracted into it, or absorbed from it. */
export type LinkShape = ExtractShape | 'absorb';

/** Where a nested mapping applies inside a property's value: the value itself, each list element, or each record value. */
export type Shape = 'struct' | 'each' | 'values';

/**
 * `Lens.within`/`Lens.each`/`Lens.values` — a property whose value is mapped by an inner mapping: a struct,
 * each element of a list of structs (element i to element i), or each value of a record of structs.
 */
export type Nested<S = any> = {
  readonly kind: 'nested';
  readonly property: keyof S & string;
  readonly shape: Shape;
  readonly mapping: Mapping;
  /** Values for properties only one side of the inner structs declares; see {@link MakeOptions}. */
  readonly defaults?: Readonly<Record<string, unknown>>;
};

/**
 * A built-in transform stored as data, computed from source properties: forward only, so the target
 * property is read-only and edits to it never reach the source.
 */
export type OneWaySpec =
  | { readonly fn: 'concat'; readonly from: readonly string[]; readonly separator: string }
  | { readonly fn: 'part'; readonly from: readonly [string]; readonly separator: string; readonly index: number }
  | {
      readonly fn: 'mapValue';
      readonly from: readonly [string];
      readonly table: Readonly<Record<string, unknown>>;
      readonly fallback?: unknown;
    }
  | { readonly fn: 'constant'; readonly from: readonly []; readonly value: unknown };

export type OneWay = { readonly kind: 'oneWay'; readonly spec: OneWaySpec };

/**
 * `Lens.extract(property, Child, mapping)` — a struct property moved into an object of its own: the target
 * property holds a reference to a `Child` object whose data the inner mapping derives from the source struct.
 * `Lens.extractEach` does the same for each element of a list of structs, into a list of references. The
 * references exist only once those objects are created, so a view reads the property as unset.
 */
export type Extract<S = any> = {
  readonly kind: 'extract';
  readonly property: keyof S & string;
  readonly shape: ExtractShape;
  readonly child: Type.AnyObj;
  readonly mapping: Mapping;
  readonly defaults?: Readonly<Record<string, unknown>>;
};

/**
 * `Lens.absorb(property, Child, mapping)` — the reverse of an extract: the source property's reference to a
 * `Child` object becomes a struct of the target, which the inner mapping derives from the object's data. The
 * struct exists only in version documents, so a view reads the property as unset.
 */
export type Absorb<S = any> = {
  readonly kind: 'absorb';
  readonly property: keyof S & string;
  readonly child: Type.AnyObj;
  readonly mapping: Mapping;
  readonly defaults?: Readonly<Record<string, unknown>>;
};

/** One target property's mapping. A bare string is the rename shorthand. */
export type MappingEntry<S = any, V = any> =
  | (keyof S & string)
  | Converted<S, V>
  | ReadOnly<S>
  | Derived<S, V, any>
  | Nested<S>
  | OneWay
  | Extract<S>
  | Absorb<S>;

/**
 * A partial mapping from target properties to the source. Every target property resolves as:
 * explicit entry, else automatic (same name and a compatible type), else overlay.
 */
export type Mapping<S = any, T = any> = {
  readonly [K in keyof T as K extends string ? K : never]?: MappingEntry<S, T[K]>;
};

/**
 * A single minimal mutation against the base object. There is deliberately no `replace`: a lens
 * cannot express "rewrite the whole object" without enumerating every property, which is what makes
 * concurrent editing through two different lenses merge rather than clobber.
 */
export type Write =
  | { readonly kind: 'assign'; readonly path: KeyPath; readonly value: unknown }
  // String CRDT edit; preserves cursors, anchors, and concurrent edits within the same string.
  | {
      readonly kind: 'splice';
      readonly path: KeyPath;
      readonly start: number;
      readonly deleteCount: number;
      readonly insert: string;
    }
  // Routed to the object's annotation dictionary, keyed by lens id then property.
  | { readonly kind: 'overlay'; readonly lens: string; readonly property: string; readonly value: unknown };

/** How each property of the target resolved, and which source properties went unread. */
export type Coverage = {
  /** Target properties resolved by an explicit mapping entry. */
  readonly explicit: readonly string[];
  /** Target properties auto-mapped by name and compatible type. */
  readonly automatic: readonly string[];
  /** Target properties with no counterpart — stored in the annotation dictionary. */
  readonly overlaid: readonly string[];
  /** Source properties absent from the view; restored by `put` from the live object. */
  readonly dropped: readonly string[];
  /**
   * A name match whose types are incompatible. Never auto-mapped and never auto-overlaid: storing
   * the value under an annotation while a same-named source property also holds it would record the
   * same fact twice and let the copies drift. Stays unresolved until the mapping says what it means.
   */
  readonly suspicious: readonly { readonly property: string; readonly candidates: readonly string[] }[];
};

/** The serializable form of an entry, for a lens stored in a space. Absent for inline mappings. */
export type SerializedEntry =
  | { readonly kind: 'rename'; readonly from: string }
  | { readonly kind: 'readOnly'; readonly from: string }
  | { readonly kind: 'converted'; readonly from: string; readonly codec: string }
  | { readonly kind: 'nested'; readonly from: string; readonly shape: Shape; readonly inner: SerializedPlan }
  | { readonly kind: 'oneWay'; readonly spec: OneWaySpec }
  | {
      readonly kind: 'extract';
      readonly from: string;
      readonly shape: ExtractShape;
      readonly child: string;
      readonly inner: SerializedPlan;
    }
  | { readonly kind: 'absorb'; readonly from: string; readonly child: string; readonly inner: SerializedPlan };

/** A plan as data: every resolved entry (same-name matches as renames) and what each side alone declares. */
export type SerializedPlan = {
  readonly entries: readonly (SerializedEntry & { readonly property: string })[];
  readonly overlays: readonly string[];
  readonly dropped: readonly string[];
  readonly defaults: Readonly<Record<string, unknown>>;
};

/** A normalized mapping entry, computed once when the lens is defined. */
export type ResolvedEntry = {
  readonly property: string;
  readonly from: readonly string[];
  readonly get: (source: Record<string, unknown>) => unknown;
  /** Absent for read-only properties. */
  readonly put?: (value: unknown, source: Record<string, unknown>) => Record<string, unknown>;
  readonly origin: 'explicit' | 'automatic';
  /** Present only when the entry is declarative enough to persist. */
  readonly serialized?: SerializedEntry;
  /** The source text of an inline function the entry runs, so the lens digest changes with it. */
  readonly code?: string;
  /** For a nested entry: where the inner plan applies, and the plan. */
  readonly nested?: { readonly shape: Shape; readonly plan: Plan };
  /** For a one-way entry: the transform. */
  readonly oneWay?: OneWaySpec;
  /**
   * For an extract or absorb entry: the other object's type, and the plan between it and the struct (from the
   * source struct to the object's data for an extract, from the object's data to the target struct for an absorb).
   */
  readonly link?: { readonly shape: LinkShape; readonly child: Type.AnyObj; readonly plan: Plan };
};

/** The compiled mapping: what to read, what to write, and what fell through to an overlay. */
export type Plan = {
  readonly entries: readonly ResolvedEntry[];
  readonly overlays: readonly string[];
  readonly coverage: Coverage;
  /** The value each property only one side declares starts at: explicit, else the schema's default. */
  readonly defaults: Readonly<Record<string, unknown>>;
  /** The properties each side requires. */
  readonly required: { readonly source: readonly string[]; readonly target: readonly string[] };
};

/** Marks a lens made in code, as distinct from a stored one (both have the lens kind). */
export const LensTypeId = '~@dxos/echo/Lens' as const;
export type LensTypeId = typeof LensTypeId;

/**
 * A lens binding a source ECHO type to a declared target type.
 *
 * The target is normally a `Type.Obj`, in which case a lensed object reports the target's typename
 * and so resolves the interfaces already written for it. A plain schema is allowed for shapes no
 * object is ever stored as (the rich-text block tree), and forfeits typename dispatch.
 */
export type Lens<S = any, T = any> = {
  readonly [LensTypeId]: LensTypeId;
  /** Entity-kind brand: a lens is an edge between two types, as a relation is between two objects. */
  readonly [KindId]: EntityKind.Lens;
  /** Entity id, stamped at construction; not the lens's identity, which is {@link name}. */
  readonly id: EntityId;
  /** Named by its endpoints (`<source> -> <target>`): there is at most one lens per pair of types. */
  readonly name: string;
  /**
   * Identifies what the lens does: the canonical JSON of its resolved mapping and defaults, or, for code, of
   * the code.
   * Version documents record it, so two builds whose lenses differ never both translate.
   */
  readonly digest: string;
  /** The key its overlay values are stored under; a composed lens keeps its last hop's. */
  readonly overlayKey: string;
  /** Values for properties only one side has: a target-only property forward, a source-only one backward. */
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly source: Type.AnyObj;
  readonly target: Type.AnyObj | Schema.Top;
  /** The lens this one reverses, when it was made by `Lens.invert`. */
  readonly reverseOf?: Lens<any, any>;
  /** Compiled mapping; `undefined` for a coded lens, whose transform is opaque. */
  readonly plan?: Plan;
  /** Project the base object into the target shape. */
  readonly get: (obj: Obj.Unknown) => T;
  /** Invert a partial target view into the minimal writes that realize it. */
  readonly put: (view: Partial<T>, obj: Obj.Unknown) => readonly Write[];
  /** Phantom, so `S`/`T` are inferable from a lens value. */
  readonly _phantom?: (source: S) => T;
};

export type AnyLens = Lens<any, any>;

/** The whole-object transform of a coded lens, for what no per-property mapping can express. */
export type CodedMapping<S = any, T = any> = {
  readonly get: (obj: S) => T;
  /** Receives the next view and the previous one, and returns only the writes that differ. */
  readonly put: (next: Partial<T>, previous: T, obj: S) => readonly Write[];
  /** Bumped whenever the code changes behavior without its source text changing (an imported value, say). */
  readonly version?: string;
};

export type MakeOptions = {
  /**
   * Values for properties only one side declares, by name, where the schema declares no default: a
   * target-only property reads it forward, a source-only property reads it backward.
   */
  readonly defaults?: Readonly<Record<string, unknown>>;
};
