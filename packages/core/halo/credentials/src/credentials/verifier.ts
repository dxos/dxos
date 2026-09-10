//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Chain, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { isValidAuthorizedDeviceCredential } from './assertions';
import { getCredentialProofPayload } from './signing';

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult = { kind: 'pass' } | { kind: 'fail'; errors: string[] };

export const verifyCredential = async (credential: Credential): Promise<VerificationResult> => {
  const proof = credential.proof;
  if (!proof) {
    return { kind: 'fail', errors: ['Credential is missing a proof.'] };
  }
  const issuer = toPublicKey(credential.issuer);
  const signer = toPublicKey(proof.signer);
  if (!issuer || !signer) {
    return { kind: 'fail', errors: ['Credential is missing its issuer or signer.'] };
  }

  if (!issuer.equals(signer)) {
    if (!proof.chain) {
      return {
        kind: 'fail',
        errors: ['Delegated credential is missing credential chain.'],
      };
    }

    const result = await verifyChain(proof.chain, issuer, signer);
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
  const proof = credential.proof;
  const signer = toPublicKey(proof?.signer);
  if (!proof || !signer) {
    return { kind: 'fail', errors: ['Credential is missing a proof.'] };
  }
  if (proof.type !== SIGNATURE_TYPE_ED25519) {
    return {
      kind: 'fail',
      errors: [`Invalid signature type: ${proof.type}`],
    };
  }

  const signData = getCredentialProofPayload(credential);
  if (!(await verifySignature(signer, signData, proof.value))) {
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
  if (!chain.credential) {
    return { kind: 'fail', errors: ['Credential chain is empty.'] };
  }

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
