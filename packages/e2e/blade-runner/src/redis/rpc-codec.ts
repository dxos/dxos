//
// Copyright 2026 DXOS.org
//

import { type Any } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

/**
 * Tag marking an encoded value. Namespaced so a payload key cannot collide with it by accident.
 */
const TYPE_KEY = '@dxos/blade-runner/type';

type ValueCodec<T> = {
  readonly name: string;
  readonly test: (value: unknown) => value is T;
  readonly encode: (value: T) => string;
  readonly decode: (value: string) => T;
};

/**
 * Types that survive the replicant boundary beyond what JSON carries.
 *
 * Without these both degrade silently rather than failing: `PublicKey.toJSON` makes a key
 * indistinguishable from a hex string, and a `Uint8Array` stringifies to `{"0":1,...}`.
 *
 * `PublicKey` is matched first so it never falls through to a byte-array encoding, and both tests
 * avoid `instanceof` so a value built against a second copy of the module still round-trips.
 */
const codecs: ValueCodec<any>[] = [
  {
    name: 'PublicKey',
    test: (value): value is PublicKey => PublicKey.isPublicKey(value),
    encode: (value) => value.toHex(),
    decode: (value) => PublicKey.fromHex(value),
  },
  {
    name: 'Uint8Array',
    test: (value): value is Uint8Array => Object.prototype.toString.call(value) === '[object Uint8Array]',
    encode: (value) => Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64'),
    decode: (value) => new Uint8Array(Buffer.from(value, 'base64')),
  },
];

const encodeValue = (value: unknown): unknown => {
  for (const codec of codecs) {
    if (codec.test(value)) {
      return { [TYPE_KEY]: codec.name, value: codec.encode(value) };
    }
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]));
  }
  return value;
};

const decodeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const tag = (value as Record<string, unknown>)[TYPE_KEY];
  if (typeof tag === 'string') {
    const codec = codecs.find((candidate) => candidate.name === tag);
    invariant(codec, `unknown encoded type: ${tag}`);
    return codec.decode((value as { value: string }).value);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decodeValue(entry)]));
};

/**
 * Codec for replicant RPC arguments and return values.
 *
 * JSON with a tagged escape for the types above; anything JSON already carries is untouched, so
 * the wire stays readable when inspecting the Redis queues by hand.
 */
export const rpcCodec = {
  encode: (value: any): Any => ({
    type_url: 'google.protobuf.Any',
    value: Buffer.from(JSON.stringify(encodeValue(value ?? [undefined]))),
  }),
  decode: (value: Any): any => decodeValue(JSON.parse(Buffer.from(value.value).toString())),
};
