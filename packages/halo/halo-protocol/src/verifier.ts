//
// Copyright 2022 DXOS.org
//

import { Keyring } from '@dxos/credentials';

import { Credential } from './proto';
import { getSignaturePayload } from './signing';

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult =
  | { kind: 'pass' }
  | { kind: 'fail', errors: string[] }

export const verifyCredential = async (credential: Credential): Promise<VerificationResult> => {
  if (!credential.issuer.equals(credential.proof.signer)) {
    return { kind: 'fail', errors: ['Chain credentials are not yet supported'] };
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
