//
// Copyright 2022 DXOS.org
//

import stableStringify from 'json-stable-stringify';

import { PublicKey } from '@dxos/protocols';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * @returns The input message to be signed for a given credential.
 */
export const getSignaturePayload = (credential: Credential): Uint8Array => {
  const copy = {
    ...credential,
    proof: {
      ...credential.proof,
      value: new Uint8Array(),
      chain: undefined
    }
  };

  return Buffer.from(canonicalStringify(copy));
};

/**
 * Utility method to produce stable output for signing/verifying.
 */
export const canonicalStringify = (obj: any) => stableStringify(obj, {
  /* The point of signing and verifying is not that the internal, private state of the objects be
   * identical, but that the public contents can be verified not to have been altered. For that reason,
   * really private fields (indicated by '__') are not included in the signature.
   * This gives a mechanism for attaching other attributes to an object without breaking the signature.
   * We also skip @type.
   */
  // TODO(dmaretskyi): Should we actually skip the @type field?
  replacer: (key: any, value: any) => {
    if (key.toString().startsWith('__') || key.toString() === '@type') {
      return undefined;
    }

    if (value) {
      if (PublicKey.isPublicKey(value)) {
        return value.toHex();
      }
      if (Buffer.isBuffer(value)) {
        return value.toString('hex');
      }
      if (value instanceof Uint8Array || (value.data && value.type === 'Buffer')) {
        return Buffer.from(value).toString('hex');
      }
    }

    return value;
  }
});
