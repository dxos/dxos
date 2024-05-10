//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { type Chain, type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { isValidAuthorizedDeviceCredential } from './assertions';
import { getCredentialProofPayload } from './signing';

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult = { kind: 'pass' } | { kind: 'fail'; errors: string[] };

export const verifyCredential = async (credential: Credential): Promise<VerificationResult> => {
  if (!credential.issuer.equals(credential.proof!.signer)) {
    if (!credential.proof!.chain) {
      return {
        kind: 'fail',
        errors: ['Delegated credential is missing credential chain.'],
      };
    }

    const result = await verifyChain(credential.proof!.chain, credential.issuer, credential.proof!.signer);
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
  if (credential.proof!.type !== SIGNATURE_TYPE_ED25519) {
    return {
      kind: 'fail',
      errors: [`Invalid signature type: ${credential.proof!.type}`],
    };
  }

  const signData = getCredentialProofPayload(credential);
  if (!(await verifySignature(credential.proof!.signer, signData, credential.proof!.value))) {
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
  const result = await verifyCredential(chain.credential);
  if (result.kind === 'fail') {
    return result;
  }

  if (!isValidAuthorizedDeviceCredential(chain.credential, authority, subject)) {
    return {
      kind: 'fail',
      errors: [`Invalid credential chain: invalid assertion for key: ${subject}`],
    };
  }

  return { kind: 'pass' };
};
