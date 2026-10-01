//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Annotation from '../../Annotation.ts';
import * as Type from '../../Type.ts';
import { EntityKind, type KindId, getEntityKindBrand } from '../common/types/index.ts';
import { EchoLensKindSchema } from '../Entity/index.ts';
import { createObject } from '../Obj/create-object.ts';
import { make } from './codec.ts';
import { hasCodec } from './codecs.ts';
import { canonical } from './identity.ts';
import { serializePlan } from './mapping.ts';
import { type AnyLens, LensTypeId, type Mapping, type MappingEntry, type SerializedPlan } from './types.ts';

//
// A lens stored in a space is an entity of the lens kind (DESIGN.md §12.7). It holds its whole plan as data —
// every resolved entry, same-name matches included, nested plans and one-way transforms — so a peer runs it
// without the schemas it connects: the host translates version documents from the stored lens alone.
//

const OneWaySpecSchema = Schema.Union([
  Schema.Struct({ fn: Schema.Literal('concat'), from: Schema.Array(Schema.String), separator: Schema.String }),
  Schema.Struct({
    fn: Schema.Literal('part'),
    from: Schema.Tuple([Schema.String]),
    separator: Schema.String,
    index: Schema.Number,
  }),
  Schema.Struct({
    fn: Schema.Literal('mapValue'),
    from: Schema.Tuple([Schema.String]),
    table: Schema.Record(Schema.String, Schema.Unknown),
    fallback: Schema.optional(Schema.Unknown),
  }),
  Schema.Struct({ fn: Schema.Literal('constant'), from: Schema.Tuple([]), value: Schema.Unknown }),
]);

const PlanEntrySchema = Schema.Union([
  Schema.Struct({ property: Schema.String, kind: Schema.Literal('rename'), from: Schema.String }),
  Schema.Struct({ property: Schema.String, kind: Schema.Literal('readOnly'), from: Schema.String }),
  Schema.Struct({
    property: Schema.String,
    kind: Schema.Literal('converted'),
    from: Schema.String,
    /** Name of a codec registered via `Lens.registerCodec`. */
    codec: Schema.String,
  }),
  Schema.Struct({
    property: Schema.String,
    kind: Schema.Literal('nested'),
    from: Schema.String,
    shape: Schema.Literals(['struct', 'each', 'values']),
    inner: Schema.suspend((): Schema.Codec<SerializedPlan> => PlanSchema),
  }),
  Schema.Struct({ property: Schema.String, kind: Schema.Literal('oneWay'), spec: OneWaySpecSchema }),
]);

const PlanSchema: Schema.Codec<SerializedPlan> = Schema.Struct({
  entries: Schema.Array(PlanEntrySchema),
  overlays: Schema.Array(Schema.String),
  dropped: Schema.Array(Schema.String),
  defaults: Schema.Record(Schema.String, Schema.Unknown),
});

/** The data of a stored lens. */
export const StoredData = Schema.Struct({
  /** The lens's name, from its endpoints. */
  name: Schema.String,
  /** URI of the source type. */
  source: Schema.String,
  /** URI of the target type. */
  target: Schema.String,
  /** What the lens does; see `Lens.digest`. */
  digest: Schema.String,
  /** Canonical JSON of the lens's plan as data (`SerializedPlan`). */
  plan: Schema.String,
});

/** The schema of a stored lens. */
export const Stored = StoredData.pipe(
  Annotation.LabelAnnotation.set(['name']),
  EchoLensKindSchema(DXN.make('org.dxos.type.lens', '0.1.0')),
);

/** A lens stored in a space. */
export type Stored = Schema.Schema.Type<typeof StoredData> & {
  readonly id: string;
  readonly [KindId]: EntityKind.Lens;
};

/** Whether `value` is a stored lens rather than one made in code. */
export const isStored = (value: unknown): value is Stored =>
  getEntityKindBrand(value) === EntityKind.Lens &&
  !(typeof value === 'object' && value !== null && LensTypeId in value);

/** The plan a stored lens's data holds, or `undefined` when the data is not a stored lens. */
export const storedPlan = (
  data: unknown,
): { stored: Schema.Schema.Type<typeof StoredData>; plan: SerializedPlan } | undefined => {
  const stored = Schema.decodeUnknownOption(StoredData)(data);
  if (Option.isNone(stored)) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored.value.plan);
  } catch {
    return undefined;
  }
  const plan = Schema.decodeUnknownOption(PlanSchema)(parsed);
  return Option.isSome(plan) ? { stored: stored.value, plan: plan.value } : undefined;
};

/** Every codec name a plan's conversions use, nested plans included. */
const codecsOf = (plan: SerializedPlan): string[] =>
  plan.entries.flatMap((entry) =>
    entry.kind === 'converted' ? [entry.codec] : entry.kind === 'nested' ? codecsOf(entry.inner) : [],
  );

/**
 * Serialize a code-defined lens for storage.
 *
 * Only declarative entries survive: a rename, a same-name match, a read-only projection, a conversion naming a
 * registered codec, a nested mapping of those, or a one-way built-in. An inline `get`/`put` pair cannot be
 * persisted, and silently dropping it would store a lens that quietly loses a property — so this throws and
 * names the offender.
 */
export const toStored = (lens: AnyLens): Stored => {
  // A coded lens has no per-property plan, so `?? []` would silently persist it as an EMPTY
  // declarative mapping that rehydrates projecting nothing.
  const { plan, source, target } = lens;
  if (!plan) {
    throw new TypeError(`Lens: "${lens.name}" is coded and has no declarative mapping to persist.`);
  }
  if (!Type.isType(target)) {
    throw new TypeError('Lens: a plain-schema target cannot be persisted; declare an ECHO type.');
  }
  const serialized = serializePlan(plan);
  if (!serialized) {
    const inline = plan.entries.find((entry) => entry.origin === 'explicit' && !entry.serialized);
    throw new TypeError(
      `Lens: "${inline?.property}" has an inline mapping and cannot be persisted; register a named codec instead.`,
    );
  }
  const unregistered = codecsOf(serialized).find((codec) => !hasCodec(codec));
  if (unregistered !== undefined) {
    throw new TypeError(`Lens: "${lens.name}" names unregistered codec "${unregistered}".`);
  }

  return createObject(Stored, {
    name: lens.name,
    source: Type.getURI(source),
    target: Type.getURI(target),
    digest: lens.digest,
    plan: canonical(serialized),
  });
};

/** The mapping that compiles back into `plan`. */
const mappingOf = (plan: SerializedPlan): Mapping => {
  const mapping: Record<string, MappingEntry> = {};
  for (const entry of plan.entries) {
    switch (entry.kind) {
      case 'rename':
        mapping[entry.property] = entry.from;
        break;
      case 'readOnly':
        mapping[entry.property] = { kind: 'readOnly', property: entry.from };
        break;
      case 'converted':
        mapping[entry.property] = { kind: 'converted', property: entry.from, codec: entry.codec };
        break;
      case 'nested':
        mapping[entry.property] = {
          kind: 'nested',
          property: entry.from,
          shape: entry.shape,
          mapping: mappingOf(entry.inner),
          defaults: entry.inner.defaults,
        };
        break;
      case 'oneWay':
        mapping[entry.property] = { kind: 'oneWay', spec: entry.spec };
        break;
    }
  }
  return mapping;
};

/**
 * Rehydrate a stored lens against the runtime types it names.
 *
 * The caller supplies the types because a lens references them by URI and the registry that resolves
 * those is the database's, not this package's. A lens rehydrated against the types it was stored with has
 * the stored digest; one whose types changed since has a different digest.
 */
export const fromStored = (stored: Stored, source: Type.AnyObj, target: Type.AnyObj): AnyLens => {
  // The caller supplies the types, so a mismatch would read the stored overlay values under mappings
  // that do not belong to them.
  if (Type.getURI(source) !== stored.source || Type.getURI(target) !== stored.target) {
    throw new TypeError(
      `Lens: stored lens "${stored.name}" declares ${stored.source} -> ${stored.target}; the supplied types do not match.`,
    );
  }
  const decoded = storedPlan(stored);
  if (!decoded) {
    throw new TypeError(`Lens: stored lens "${stored.name}" holds no valid plan.`);
  }
  return make(source, target, mappingOf(decoded.plan), { defaults: decoded.plan.defaults });
};
