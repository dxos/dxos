import { invariant } from '@dxos/invariant';
import base32Encode from 'base32-encode';
import base32Decode from 'base32-decode';
import { randomBytes } from './random-bytes';

/**
 * A unique identifier for a space.
 */
export type SpaceId = string & { __SpaceId: true };

export const SpaceId = Object.freeze({
  byteLength: 20,
  encode: (value: Uint8Array): SpaceId => {
    invariant(value instanceof Uint8Array, 'Invalid type');
    invariant(value.length === SpaceId.byteLength, 'Invalid length');

    return (MULTIBASE_PREFIX + base32Encode(value, 'RFC4648')) as SpaceId;
  },
  decode: (value: SpaceId): Uint8Array => {
    invariant(value.startsWith(MULTIBASE_PREFIX), 'Invalid multibase32 encoding');

    return new Uint8Array(base32Decode(value.slice(1), 'RFC4648'));
  },
  isValid: (value: string): value is SpaceId => {
    return typeof value === 'string' && value.startsWith(MULTIBASE_PREFIX) && value.length === ENCODED_LENGTH;
  },
  random: (): SpaceId => {
    return SpaceId.encode(randomBytes(SpaceId.byteLength));
  },
});

const MULTIBASE_PREFIX = 'B';
const ENCODED_LENGTH = 33;
