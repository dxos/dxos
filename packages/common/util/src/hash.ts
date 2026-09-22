//
// Copyright 2026 DXOS.org
//

/**
 * Non-cryptographic string hashes, in one place.
 *
 * These exist for bucketing and change detection — picking a palette hue, keying a cache, noticing
 * that a serialized value differs from the one already stored. They are fast and allocation-light
 * and make no promise against an adversary: nothing here is a substitute for a real digest when
 * the input is untrusted or the output is a security boundary.
 *
 * FNV-1a in both widths, rather than a choice of algorithms, because the only thing several
 * scattered copies of "a simple string hash" ever needed was to agree with themselves across
 * runs — and agreeing with each other costs nothing once they share an implementation.
 */

const FNV32_OFFSET = 0x811c9dc5;
const FNV32_PRIME = 0x01000193;

const FNV64_OFFSET = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const FNV64_MASK = 0xffffffffffffffffn;

/**
 * FNV-1a digest of a string as an unsigned 32-bit integer.
 *
 * `Math.imul` keeps the multiply in 32-bit integer space, and the final shift makes the result
 * unsigned — so it is safe to use directly as a modulus operand without a sign check.
 */
export const fnv1a32 = (value: string): number => {
  let hash = FNV32_OFFSET;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV32_PRIME);
  }
  return hash >>> 0;
};

/**
 * FNV-1a digest of a string as 16 lowercase hex characters.
 *
 * The 64-bit width is worth its BigInt cost wherever a collision means a *missed* difference
 * rather than a shared bucket: 32 bits starts colliding at a few tens of thousands of distinct
 * inputs, which is well within reach of a content digest over a set of records.
 */
export const fnv1a64 = (value: string): string => {
  let hash = FNV64_OFFSET;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash ^ BigInt(value.charCodeAt(index))) * FNV64_PRIME) & FNV64_MASK;
  }
  return hash.toString(16).padStart(16, '0');
};
