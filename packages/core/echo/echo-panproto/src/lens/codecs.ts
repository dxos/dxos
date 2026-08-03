//
// Copyright 2026 DXOS.org
//

import { type Codec } from './types';

//
// Value codecs referenced by name, mirroring the wire runner's `registerTextFormat`/`registerRefType`.
// A named codec is what makes a mapping serializable: an inline function cannot be persisted, so a
// lens stored in a space references its conversions by name instead.
//

const codecs = new Map<string, Codec>();

/** Register a codec so a mapping (and a persisted lens) can reference it by name. */
export const registerCodec = (name: string, codec: Codec): void => {
  codecs.set(name, codec);
};

export const getCodec = (name: string): Codec => {
  const codec = codecs.get(name);
  if (!codec) {
    throw new Error(`Lens: unregistered codec "${name}".`);
  }
  return codec;
};

export const hasCodec = (name: string): boolean => codecs.has(name);

/**
 * Multiply on read, divide on write — unit conversions (minutes to hours).
 *
 * Not an isomorphism over floats: `checkLaws` compares numbers with a tolerance rather than for
 * equality, so a lens built on this does not fail its round-trip law on a representation artifact.
 */
export const scale = (factor: number): Codec<number, number> => ({
  decode: (value) => value * factor,
  encode: (value) => value / factor,
});

/** Map between two closed value sets (enum to enum). Unknown inputs pass through unchanged. */
export const lookup = <A extends string | number, B extends string | number>(forward: Record<A, B>): Codec<A, B> => {
  // Two keys mapping to one value make `backward` lossy, which breaks the codec's own round trip —
  // caught here at the definition site rather than later as a checkLaws violation.
  const values = Object.values(forward);
  if (new Set(values).size !== values.length) {
    throw new TypeError('Lens: a lookup codec must be injective; two keys map to the same value.');
  }

  const backward = Object.fromEntries(Object.entries(forward).map(([key, value]) => [value, key])) as Record<B, A>;
  return {
    decode: (value) => forward[value] ?? (value as unknown as B),
    encode: (value) => backward[value] ?? (value as unknown as A),
  };
};
