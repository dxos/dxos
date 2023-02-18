//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { Presentation, Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

import { SIGNATURE_TYPE_ED25519, VerificationResult, verifyCredential } from '../credentials';
import { getPresentationProofPayload } from './signing';

export const verifyPresentation = async (presentation: Presentation): Promise<VerificationResult> => {
  const errors: string[] = [];
  const credentialsVerifications = await Promise.all(
    presentation.credentials?.map((credential) => verifyCredential(credential)) ?? []
  );
  for (const verification of credentialsVerifications) {
    if (verification.kind === 'fail') {
      errors.push(...verification.errors);
    }
  }

  const proofVerification = await Promise.all(
    presentation.proofs?.map((proof) => {
      if (!proof.chain) {
        return {
          kind: 'fail',
          errors: ['Delegated credential is missing credential chain.']
        };
      }
      // TODO(mykola): Add chain verification?

      return verifyPresentationSignature(presentation, proof);
    }) ?? []
  );
  for (const verification of proofVerification) {
    if (verification.kind === 'fail') {
      errors.push(...verification.errors);
    }
  }

  if (errors.length === 0) {
    return { kind: 'pass' };
  }
  {
    return {
      kind: 'fail',
      errors
    };
  }
};

/**
 * Verifies that the signature is valid and was made by the signer.
 * Does not validate other semantics (e.g. chains).
 */
export const verifyPresentationSignature = async (
  presentation: Presentation,
  proof: Proof
): Promise<VerificationResult> => {
  if (proof.type !== SIGNATURE_TYPE_ED25519) {
    return {
      kind: 'fail',
      errors: [`Invalid signature type: ${proof.type}`]
    };
  }

  const signData = getPresentationProofPayload(presentation.credentials ?? [], proof);
  if (!(await verifySignature(proof.signer, signData, proof.value))) {
    return { kind: 'fail', errors: ['Invalid signature'] };
  }

  return { kind: 'pass' };
};
