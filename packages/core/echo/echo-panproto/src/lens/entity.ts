//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

import { make } from './codec.ts';
import { hasCodec } from './codecs.ts';
import { type AnyLens, type Mapping } from './types.ts';

//
// A persisted lens is an ordinary ECHO object, not a new entity kind: `Type` earns its own kind
// because it IS schema (the database validates and indexes against it), whereas a lens is metadata
// ABOUT two types. `db.add()` and `Filter.type(Lens.Object)` are all it needs.
//

/** One target property's serialized mapping. Inline functions are not serializable; see {@link toObject}. */
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

/** A lens stored in a space (cf. `Type.Type` for stored schemas). */
export class Lens extends Type.makeObject<Lens>(DXN.make('org.dxos.type.lens', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Lens id — stable across serialization, and the key its overlay values are stored under. */
    lens: Schema.String,
    /** `typename@version` of the source type. */
    source: Schema.String,
    /** `typename@version` of the declared target type. */
    target: Schema.String,
    entries: Schema.Array(Entry),
  }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

/**
 * Serialize a code-defined lens for storage.
 *
 * Only declarative entries survive: a rename, a read-only projection, or a conversion naming a
 * registered codec. An inline `get`/`put` pair cannot be persisted, and silently dropping it would
 * store a lens that quietly loses a property — so this throws and names the offender.
 */
export const toObject = (lens: AnyLens, options: { name?: string } = {}): Lens => {
  // A coded lens has no per-property plan, so `?? []` would silently persist it as an EMPTY
  // declarative mapping that rehydrates projecting nothing.
  if (!lens.plan) {
    throw new TypeError(`Lens: "${lens.id}" is coded and has no declarative mapping to persist.`);
  }

  const target = lens.target as Type.AnyEntity;
  if (!Type.isType(target)) {
    throw new TypeError('Lens: a plain-schema target cannot be persisted; declare an ECHO type.');
  }

  const entries: Entry[] = [];
  for (const entry of lens.plan.entries) {
    if (entry.origin === 'automatic') {
      // Re-derived on load from the same name/type match, so it is not stored.
      continue;
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
    entries.push({ property: entry.property, ...serialized });
  }

  return Obj.make(Lens, {
    name: options.name,
    lens: lens.id,
    source: Type.getURI(lens.source),
    target: Type.getURI(target),
    entries,
  });
};

/**
 * Rehydrate a stored lens against the runtime types it names.
 *
 * The caller supplies the types because a lens references them by typename and the registry that
 * resolves those is the database's, not this package's. Automatic mappings are recomputed, so a
 * stored lens picks up a source property added since it was written.
 */
export const fromObject = (stored: Lens, source: Type.AnyObj, target: Type.AnyObj): AnyLens => {
  // The caller supplies the types, so a mismatch would read the stored overlay values under mappings
  // that do not belong to them.
  if (Type.getURI(source) !== stored.source || Type.getURI(target) !== stored.target) {
    throw new TypeError(
      `Lens: stored lens "${stored.lens}" declares ${stored.source} -> ${stored.target}; the supplied types do not match.`,
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

  return make(stored.lens, source, target, mapping as Mapping);
};
