//
// Copyright 2022 DXOS.org
//

import { Keyring } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';
import { Chain, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { isValidAuthorizedDeviceCredential } from './assertions';
import { getSignaturePayload } from './signing';

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult =
  | { kind: 'pass' }
  | { kind: 'fail', errors: string[] }

export const verifyCredential = async (credential: Credential): Promise<VerificationResult> => {
  if (!credential.issuer.equals(credential.proof.signer)) {
    if (!credential.proof.chain) {
      return { kind: 'fail', errors: ['Delegated credential is missing credential chain.'] };
    }

    const result = await verifyChain(credential.proof.chain, credential.issuer, credential.proof.signer);
    if (result.kind === 'fail') {
      return result;
    }
  }

  {
    const result = await verifySignature(credential);
    if (result.kind === 'fail') {
      return result;
    }
  }

  return { kind: 'pass' };
};

/**
 * Verifies that the signature is valid and was made by the signer.
 * Does not validate other semantics (e.g. chains).
 */
const verifySignature = async (credential: Credential): Promise<VerificationResult> => {
  if (credential.proof.type !== SIGNATURE_TYPE_ED25519) {
    return { kind: 'fail', errors: [`Invalid signature type: ${credential.proof.type}`] };
  }

  const signData = getSignaturePayload(credential);
  if (!Keyring.cryptoVerify(Buffer.from(signData), Buffer.from(credential.proof.value), credential.proof.signer.asBuffer())) {
    return { kind: 'fail', errors: ['Invalid signature'] };
  }

  return { kind: 'pass' };
};

/**
 * Verifies the the signer has the delegated authority to create credentials on the half of the issuer.
 */
const verifyChain = async (chain: Chain, authority: PublicKey, subject: PublicKey): Promise<VerificationResult> => {
  const result = await verifyCredential(chain.credential);
  if (result.kind === 'fail') {
    return result;
  }

  if (!isValidAuthorizedDeviceCredential(chain.credential, authority, subject)) {
    return { kind: 'fail', errors: [`Invalid credential chain: invalid assertion for key: ${subject}`] };
  }

  return { kind: 'pass' };
};
