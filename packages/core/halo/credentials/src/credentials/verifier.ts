//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { type Chain, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';

import { isValidAuthorizedDeviceCredential } from './assertions';
import { getCredentialProofPayload } from './signing';

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult = { kind: 'pass' } | { kind: 'fail'; errors: string[] };

/** Helper to convert buf PublicKey message (or @dxos/keys PublicKey) to @dxos/keys PublicKey. */
const fromBufPublicKey = (key: BufPublicKey | PublicKey): PublicKey =>
  key instanceof PublicKey ? key : PublicKey.from(key.data);

/** Check if two buf PublicKey messages are equal. */
const bufPublicKeysEqual = (a?: BufPublicKey, b?: BufPublicKey): boolean => {
  if (!a || !b) {
    return false;
  }
  return fromBufPublicKey(a).equals(fromBufPublicKey(b));
};

export const verifyCredential = async (credential: Credential): Promise<VerificationResult> => {
  if (credential.parentCredentialIds?.length === 0) {
    delete (credential as { parentCredentialIds?: unknown }).parentCredentialIds;
  }

  if (!bufPublicKeysEqual(credential.issuer, credential.proof?.signer)) {
    if (!credential.proof?.chain) {
      return {
        kind: 'fail',
        errors: ['Delegated credential is missing credential chain.'],
      };
    }

    const result = await verifyChain(
      credential.proof.chain,
      fromBufPublicKey(credential.issuer!),
      fromBufPublicKey(credential.proof.signer!),
    );
    if (result.kind === 'fail') {
      return result;
    }
  }

  const result = await verifyCredentialSignature(credential);
  if (result.kind === 'fail') {
    return result;
  }

  return { kind: 'pass' };
};

/**
 * Verifies that the signature is valid and was made by the signer.
 * Does not validate other semantics (e.g. chains).
 */
export const verifyCredentialSignature = async (credential: Credential): Promise<VerificationResult> => {
  if (credential.proof?.type !== SIGNATURE_TYPE_ED25519) {
    return {
      kind: 'fail',
      errors: [`Invalid signature type: ${credential.proof?.type}`],
    };
  }

  const signData = getCredentialProofPayload(credential);
  const signerKey = fromBufPublicKey(credential.proof.signer!);
  if (!(await verifySignature(signerKey, signData, credential.proof.value))) {
    return { kind: 'fail', errors: ['Invalid signature'] };
  }

  return { kind: 'pass' };
};

/**
 * Verifies that the signer has the delegated authority to create credentials on behalf of the issuer.
 */
export const verifyChain = async (
  chain: Chain,
  authority: PublicKey,
  subject: PublicKey,
): Promise<VerificationResult> => {
  const result = await verifyCredential(chain.credential!);
  if (result.kind === 'fail') {
    return result;
  }

  if (!isValidAuthorizedDeviceCredential(chain.credential!, authority, subject)) {
    return {
      kind: 'fail',
      errors: [`Invalid credential chain: invalid assertion for key: ${subject}`],
    };
  }

  return { kind: 'pass' };
};
