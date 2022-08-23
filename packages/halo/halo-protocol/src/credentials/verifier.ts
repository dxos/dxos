//
// Copyright 2022 DXOS.org
//

import { Keyring } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';
import { ComplexSet } from '@dxos/util';

import { Chain, Credential } from '../proto';
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
const verifyChain = async (chain: Chain, issuer: PublicKey, signer: PublicKey): Promise<VerificationResult> => {
  // Keep track of process keys to avoid infinite recursion.
  const seenKeys = new ComplexSet<PublicKey>(x => x.toHex());

  const verify = async (key: PublicKey): Promise<VerificationResult> => {
    if (seenKeys.has(key)) {
      return { kind: 'fail', errors: ['Invalid credential chain: cyclic chain detected.'] };
    }
    seenKeys.add(key);

    const credential = chain.credentials?.[key.toHex()];
    if (!credential) {
      return { kind: 'fail', errors: [`Invalid credential chain: missing credential for key: ${key}`] };
    }

    {
      const result = await verifyCredential(credential);
      if (result.kind === 'fail') {
        return result;
      }
    }

    if (!isValidAuthorizedDeviceCredential(credential, issuer, key)) {
      return { kind: 'fail', errors: [`Invalid credential chain: invalid assertion for key: ${key}`] };
    }

    if (!credential.issuer.equals(issuer)) {
      return verify(credential.issuer);
    }

    return { kind: 'pass' };
  };

  return verify(signer);
};
