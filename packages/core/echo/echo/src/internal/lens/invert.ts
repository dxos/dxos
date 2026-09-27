//
// Copyright 2026 DXOS.org
//

import * as Type from '../../Type.ts';
import { make } from './codec.ts';
import { getCodec, hasCodec } from './codecs.ts';
import { type AnyLens, type Codec, type MappingEntry } from './types.ts';

//
// Reversing a lens. Only safe for the subset of mappings that are bijective by construction: a
// same-name pass-through, a bare rename, or a conversion through a codec registered by name (its
// `decode`/`encode` swapped is itself a codec). A `Derived` entry's `get`/`put` are arbitrary
// functions — nothing here can prove they invert each other — and a `put` that writes several source
// properties (or two entries that write the same one) has no single reverse target to land on, so
// either one makes the WHOLE lens uninvertible, not just the property responsible.
//

/**
 * The reverse of a lens (target back to source), or `undefined` when it is not safely invertible.
 *
 * Qualifies: a declarative lens ({@link make}, not {@link coded}) targeting a declared object type,
 * every one of whose properties is either an automatic same-name match, a bare rename, or a
 * conversion through a codec registered by name — an inline codec's `encode`/`decode` are not
 * recoverable from the compiled entry, so it is treated as uninvertible. A read-only property, a
 * `Derived` entry, or two properties renamed from the same source property (the reverse would need
 * two targets for one property) all fail this check for the whole lens.
 *
 * Verified, not just declared: the reverse mapping is compiled the same way {@link make} compiles any
 * other, and if that compilation reports a suspicious (unresolved) property — the asymmetry
 * `compatible` catches only in one direction, e.g. a required source auto-mapped to an optional
 * target — the result is rejected too.
 */
export const invert = (lens: AnyLens): AnyLens | undefined => {
  if (!lens.plan) {
    return undefined;
  }
  const target = lens.target;
  if (!Type.isType(target) || !Type.isObject(target)) {
    return undefined;
  }

  const mapping: { [property: string]: MappingEntry } = {};
  const claimed = new Set<string>();

  for (const entry of lens.plan.entries) {
    if (!entry.put) {
      return undefined;
    }
    const [from] = entry.from;
    if (entry.from.length !== 1 || from === undefined || claimed.has(from)) {
      return undefined;
    }

    if (entry.origin === 'automatic') {
      // Same name both ways — `make` re-detects it as automatic when it compiles the reverse.
      claimed.add(from);
      continue;
    }

    if (entry.serialized?.kind === 'rename') {
      claimed.add(from);
      mapping[from] = entry.property;
      continue;
    }

    if (entry.serialized?.kind === 'converted') {
      if (!hasCodec(entry.serialized.codec)) {
        return undefined;
      }
      const codec: Codec = getCodec(entry.serialized.codec);
      claimed.add(from);
      mapping[from] = {
        kind: 'converted',
        property: entry.property,
        codec: { decode: codec.encode, encode: codec.decode },
      };
      continue;
    }

    // A `Derived` entry, or a read-only/converted entry with no recoverable codec: opaque in
    // reverse, so the whole lens is not invertible.
    return undefined;
  }

  const reversed = make(`${lens.id}#inverted`, target, lens.source, mapping);
  if ((reversed.plan?.coverage.suspicious.length ?? 0) > 0) {
    return undefined;
  }
  return reversed;
};
