//
// Copyright 2022 DXOS.org
//

import { toBinary } from '@bufbuild/protobuf';
import stableStringify from 'json-stable-stringify';

import { PublicKey } from '@dxos/keys';
import { decodeCompat } from '@dxos/protocols/buf-shape-compat';
import {
  type Credential,
  CredentialSchema,
  type Proof,
  ProofSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';
import { arrayToBuffer } from '@dxos/util';

/**
 * The credential shape the signature is computed over.
 *
 * A signature covers `canonicalStringify` of the credential's *substituted* shape — `PublicKey`
 * instances, `Date`s, an inlined assertion — not its wire bytes, so that shape is part of the
 * signature format and cannot change without invalidating every issued credential. Only the fields
 * the payload logic below touches are named; the rest pass through the stringifier untyped.
 */
type SigningShape = {
  id?: unknown;
  parentCredentialIds?: unknown[];
  proof?: Record<string, unknown>;
  subject?: { assertion?: Record<string, unknown> } & Record<string, unknown>;
} & Record<string, unknown>;

/**
 * Resolves a buf credential into the shape the signature covers.
 *
 * Goes via wire bytes so the substitutions are read off the descriptor rather than restated here,
 * which is what makes it byte-identical to what the protobuf.js codec produced — the golden vector
 * in `testing/golden-credential.ts` is the guard.
 */
export const toSigningShape = (credential: Credential): SigningShape =>
  decodeCompat<SigningShape>(CredentialSchema, toBinary(CredentialSchema, credential));

/** Resolves a proof into the shape its signature covers, for a presentation's own proofs. */
export const toProofSigningShape = (proof: Proof): Record<string, unknown> =>
  decodeCompat<Record<string, unknown>>(ProofSchema, toBinary(ProofSchema, proof));

/**
 * @returns The input message to be signed for a given credential.
 */
// TODO(nf): rename, this returns not the proof itself, but the payload for verifying against the proof.
export const getCredentialProofPayload = (credential: Credential): Uint8Array => {
  // Resolved before the proof is zeroed: proto3 omits an empty bytes field, so zeroing first would
  // drop `proof.value` from the wire and the payload would lose its `"value":""` entry.
  const resolved = toSigningShape(credential);
  const copy = {
    ...resolved,
    proof: {
      ...resolved.proof,
      value: new Uint8Array(),
      chain: undefined,
    },
  };
  if (copy.parentCredentialIds?.length === 0) {
    delete copy.parentCredentialIds;
  }
  delete copy.id; // ID is not part of the signature payload.

  // Normalize proto3-default values in the assertion to avoid serialization asymmetry.
  // Proto3 omits fields equal to their default on the wire (empty arrays, 0, "", false),
  // and our codec doesn't restore defaults on decode — so after a round-trip the field
  // is absent. The signing payload must pre-strip these defaults (plus `null`/`undefined`,
  // which the canonical stringify replacer also drops) so signer and verifier produce the
  // same canonical bytes regardless of whether the field was explicitly set to its default.
  // Clone subject + assertion so we don't mutate the caller's credential.
  const originalAssertion = copy.subject?.assertion;
  if (originalAssertion) {
    const normalizedAssertion: Record<string, any> = { ...originalAssertion };
    for (const key of Object.keys(normalizedAssertion)) {
      const val = normalizedAssertion[key];
      if (
        val === undefined ||
        val === null ||
        val === 0 ||
        val === '' ||
        val === false ||
        (Array.isArray(val) && val.length === 0)
      ) {
        delete normalizedAssertion[key];
      }
    }
    copy.subject = { ...copy.subject, assertion: normalizedAssertion as typeof originalAssertion };
  }

  return Buffer.from(canonicalStringify(copy));
};

/**
 * Utility method to produce stable output for signing/verifying.
 */
export const canonicalStringify = (obj: any): string =>
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
  }) as string;

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
