//
// Copyright 2022 DXOS.org
//

import stableStringify from 'json-stable-stringify';

import { PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { arrayToBuffer } from '@dxos/util';

/**
 * @returns The input message to be signed for a given credential.
 */
// TODO(nf): rename, this returns not the proof itself, but the payload for verifying against the proof.
export const getCredentialProofPayload = (credential: Credential): Uint8Array => {
  const copy = {
    ...credential,
    proof: {
      ...credential.proof,
      value: new Uint8Array(),
      chain: undefined,
    },
  };
  if (copy.parentCredentialIds?.length === 0) {
    delete copy.parentCredentialIds;
  }
  delete copy.id; // ID is not part of the signature payload.

  return Buffer.from(canonicalStringify(copy));
};

/**
 * Utility method to produce stable output for signing/verifying.
 */
export const canonicalStringify = (obj: any) =>
  stableStringify(obj, {
    /* The point of signing and verifying is not that the internal, private state of the objects be
     * identical, but that the public contents can be verified not to have been altered. For that reason,
     * really private fields (indicated by '__') are not included in the signature.
     * This gives a mechanism for attaching other attributes to an object without breaking the signature.
     * We also skip @type.
     */
    // TODO(dmaretskyi): Should we actually skip the @type field?
    replacer: function (this: any, key: any, value: any) {
      if (key.toString().startsWith('__') || key.toString() === '@type') {
        return undefined;
      }

      if (value === null) {
        return undefined;
      }

      // Value before .toJSON() is called.
      const original = this[key];

      if (value) {
        if (PublicKey.isPublicKey(value)) {
          return value.toHex();
        }
        if (Buffer.isBuffer(value)) {
          return value.toString('hex');
        }

        if (value instanceof Uint8Array) {
          return arrayToBuffer(value).toString('hex');
        }
        if (value.data && value.type === 'Buffer') {
          return Buffer.from(value).toString('hex');
        }
        if (original instanceof Timeframe) {
          // Uses old key truncation method (339d...9d66) to keep backwards compatibility.
          return original.frames().reduce((frames: Record<string, number>, [key, seq]) => {
            frames[truncateKey(key)] = seq;
            return frames;
          }, {});
        }
      }

      return value;
    },
  });

/**
 * Old key truncation method (339d...9d66) to keep backwards compatibility with credentials signed with old method
 */
const truncateKey = (key: PublicKey) => {
  const str = key.toHex();
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
};

/**
 * export const truncateKey = (key: any, { length = 8, start }: TruncateKeyOptions = {}) => {
const str = String(key);
if (str.length <= length) {
  return str;
}

return start
  ? `${str.slice(0, length)}...`
  : `${str.substring(0, length / 2)}...${str.substring(str.length - length / 2)}`;
};

{
"04009285": 20,
"0415004f": 0,
"0415e6d7": 9964,
"042a4fa9": 8,
"0448e62f": 3,
"04775053": 257,
"04a6b603": 97,
"04bc5c9d": 198,
"04da9930": 59,
"04df0449": 676,
"04e122ae": 5435,
"04ee588b": 1703
}

 */
