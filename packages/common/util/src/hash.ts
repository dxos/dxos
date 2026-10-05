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

// 64-bit FNV-1a in two 32-bit halves. The prime is 2^40 + 0x1b3, which fits the whole multiply
// into doubles: every partial product below stays under 2^42 and so stays exact.
const FNV64_OFFSET_HI = 0xcbf29ce4;
const FNV64_OFFSET_LO = 0x84222325;
const FNV64_PRIME_LO = 0x1b3;
const FNV64_PRIME_HI = 0x100;

/**
 * FNV-1a digest of a string as 16 lowercase hex characters.
 *
 * The 64-bit width is worth having wherever a collision means a *missed* difference rather than a
 * shared bucket: 32 bits starts colliding at a few tens of thousands of distinct inputs, which is
 * well within reach of a content digest over a set of records.
 *
 * Two 32-bit halves rather than a BigInt: this runs over whole record sets on hot paths, and the
 * BigInt form allocates once per character — an order of magnitude slower for the same digest.
 */
export const fnv1a64 = (value: string): string => {
  let hi = FNV64_OFFSET_HI;
  let lo = FNV64_OFFSET_LO;
  for (let index = 0; index < value.length; index++) {
    lo = (lo ^ value.charCodeAt(index)) >>> 0;
    const low = lo * FNV64_PRIME_LO;
    const nextLo = low >>> 0;
    // Exact: `low` is below 2^41, so the difference is a whole multiple of 2^32.
    const carry = (low - nextLo) / 0x100000000;
    hi = (hi * FNV64_PRIME_LO + lo * FNV64_PRIME_HI + carry) >>> 0;
    lo = nextLo;
  }
  return hi.toString(16).padStart(8, '0') + lo.toString(16).padStart(8, '0');
};
