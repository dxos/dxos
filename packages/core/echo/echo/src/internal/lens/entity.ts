//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Annotation from '../../Annotation.ts';
import * as Type from '../../Type.ts';
import { EntityKind, KindId, getEntityKindBrand } from '../common/types/index.ts';
import { EchoLensKindSchema } from '../Entity/index.ts';
import { createObject } from '../Obj/create-object.ts';
import { make } from './codec.ts';
import { hasCodec } from './codecs.ts';
import { canonical, resolveDefaults } from './identity.ts';
import { type AnyLens, LensTypeId, type Mapping, type SerializedEntry } from './types.ts';

//
// A lens stored in a space is an entity of the lens kind (DESIGN.md §12.7). It holds every resolved entry,
// same-name matches included, and the properties each side alone declares, so a peer runs it without the
// schemas it connects: the host translates version documents from the stored lens alone.
//

/** One target property's resolved mapping. Inline functions are not serializable; see {@link toStored}. */
const Entry = Schema.Union([
  Schema.Struct({ property: Schema.String, kind: Schema.Literal('rename'), from: Schema.String }),
  Schema.Struct({ property: Schema.String, kind: Schema.Literal('readOnly'), from: Schema.String }),
  Schema.Struct({
    property: Schema.String,
    kind: Schema.Literal('converted'),
    from: Schema.String,
    /** Name of a codec registered via `Lens.registerCodec`. */
    codec: Schema.String,
  }),
]);

type Entry = Schema.Schema.Type<typeof Entry>;

const StoredStruct = Schema.Struct({
  /** The lens's name, from its endpoints. */
  name: Schema.String,
  /** URI of the source type. */
  source: Schema.String,
  /** URI of the target type. */
  target: Schema.String,
  /** What the lens does; see `Lens.digest`. */
  digest: Schema.String,
  /** Every target property the source feeds. */
  entries: Schema.Array(Entry),
  /** Target properties no source property feeds. */
  overlays: Schema.Array(Schema.String),
  /** Source properties the target drops. */
  dropped: Schema.Array(Schema.String),
  /** Canonical JSON of the values properties only one side declares start at. */
  defaults: Schema.String,
});

/** The schema of a stored lens. */
export const Stored = StoredStruct.pipe(
  Annotation.LabelAnnotation.set(['name']),
  EchoLensKindSchema(DXN.make('org.dxos.type.lens', '0.1.0')),
);

/** A lens stored in a space. */
export type Stored = Schema.Schema.Type<typeof StoredStruct> & {
  readonly id: string;
  readonly [KindId]: EntityKind.Lens;
};

/** Whether `value` is a stored lens rather than one made in code. */
export const isStored = (value: unknown): value is Stored =>
  getEntityKindBrand(value) === EntityKind.Lens &&
  !(typeof value === 'object' && value !== null && LensTypeId in value);

const entryOf = (property: string, serialized: SerializedEntry): Entry =>
  serialized.kind === 'converted'
    ? { property, kind: 'converted', from: serialized.from, codec: serialized.codec }
    : { property, kind: serialized.kind, from: serialized.from };

/**
 * Serialize a code-defined lens for storage.
 *
 * Only declarative entries survive: a rename, a same-name match, a read-only projection, or a conversion
 * naming a registered codec. An inline `get`/`put` pair cannot be persisted, and silently dropping it would
 * store a lens that quietly loses a property — so this throws and names the offender.
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

  const entries = plan.entries.map((entry): Entry => {
    if (entry.origin === 'automatic') {
      return { property: entry.property, kind: 'rename', from: entry.property };
    }
    const serialized = entry.serialized;
    if (!serialized) {
      throw new TypeError(
        `Lens: "${entry.property}" has an inline mapping and cannot be persisted; register a named codec instead.`,
      );
    }
    if (serialized.kind === 'converted' && !hasCodec(serialized.codec)) {
      throw new TypeError(`Lens: "${entry.property}" names unregistered codec "${serialized.codec}".`);
    }
    return entryOf(entry.property, serialized);
  });

  return createObject(Stored, {
    name: lens.name,
    source: Type.getURI(source),
    target: Type.getURI(target),
    digest: lens.digest,
    entries,
    overlays: [...plan.overlays],
    dropped: [...plan.coverage.dropped],
    defaults: canonical(resolveDefaults(source, target, plan, lens.defaults)),
  });
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

  const mapping: Record<string, unknown> = {};
  for (const entry of stored.entries) {
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
    }
  }

  const defaults: unknown = JSON.parse(stored.defaults);
  return make(source, target, mapping as Mapping, {
    defaults: typeof defaults === 'object' && defaults !== null ? { ...defaults } : {},
  });
};
