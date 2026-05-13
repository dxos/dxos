//
// Copyright 2026 DXOS.org
//
// Vendored from `varint@6.0.0` (MIT, https://github.com/chrisdickinson/varint).
// Inlining the implementation keeps the bundle ESM-only and removes the CJS
// runtime dependency that the legacy `--bundlePackage=varint` esbuild flag was
// pulling in. The original module exports `encode`, `decode`, and
// `encodingLength` plus an `encode.bytes` / `decode.bytes` byte-count side
// channel; the three named exports preserve that contract.
//

const MSB = 0x80;
const REST = 0x7f;
const MSBALL = ~REST;
const INT = Math.pow(2, 31);

type EncodeBuffer = Uint8Array | number[];

export interface EncodeFn {
  (num: number, out?: EncodeBuffer, offset?: number): EncodeBuffer;
  /** Number of bytes written by the most recent {@link encode} call. */
  bytes: number;
}

export interface DecodeFn {
  (buf: Uint8Array | number[], offset?: number): number;
  /** Number of bytes consumed by the most recent {@link decode} call. */
  bytes: number;
}

export const encode: EncodeFn = ((num, out, offset) => {
  if (Number.MAX_SAFE_INTEGER && num > Number.MAX_SAFE_INTEGER) {
    encode.bytes = 0;
    throw new RangeError('Could not encode varint');
  }
  const buf: EncodeBuffer = out ?? [];
  let off = offset ?? 0;
  const oldOffset = off;

  while (num >= INT) {
    (buf as any)[off++] = (num & 0xff) | MSB;
    num /= 128;
  }
  while (num & MSBALL) {
    (buf as any)[off++] = (num & 0xff) | MSB;
    num >>>= 7;
  }
  (buf as any)[off] = num | 0;

  encode.bytes = off - oldOffset + 1;

  return buf;
}) as EncodeFn;
encode.bytes = 0;

export const decode: DecodeFn = ((buf, offset) => {
  let res = 0;
  let off = offset ?? 0;
  let shift = 0;
  let counter = off;
  let b: number;
  const l = buf.length;

  do {
    if (counter >= l || shift > 49) {
      decode.bytes = 0;
      throw new RangeError('Could not decode varint');
    }
    b = (buf as any)[counter++];
    res += shift < 28 ? (b & REST) << shift : (b & REST) * Math.pow(2, shift);
    shift += 7;
  } while (b >= MSB);

  decode.bytes = counter - off;

  return res;
}) as DecodeFn;
decode.bytes = 0;

const N1 = Math.pow(2, 7);
const N2 = Math.pow(2, 14);
const N3 = Math.pow(2, 21);
const N4 = Math.pow(2, 28);
const N5 = Math.pow(2, 35);
const N6 = Math.pow(2, 42);
const N7 = Math.pow(2, 49);
const N8 = Math.pow(2, 56);
const N9 = Math.pow(2, 63);

export const encodingLength = (value: number): number =>
  value < N1
    ? 1
    : value < N2
      ? 2
      : value < N3
        ? 3
        : value < N4
          ? 4
          : value < N5
            ? 5
            : value < N6
              ? 6
              : value < N7
                ? 7
                : value < N8
                  ? 8
                  : value < N9
                    ? 9
                    : 10;

export default { encode, decode, encodingLength };
