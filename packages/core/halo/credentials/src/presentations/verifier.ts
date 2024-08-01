//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { type Presentation, type Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getPresentationProofPayload } from './signing';
import { SIGNATURE_TYPE_ED25519, type VerificationResult, verifyChain, verifyCredential } from '../credentials';

export const verifyPresentation = async (presentation: Presentation): Promise<VerificationResult> => {
  const errors: string[] = [];

  // Verify all credentials.
  const credentialsVerifications = await Promise.all(
    presentation.credentials?.map((credential) => verifyCredential(credential)) ?? [],
  );
  for (const verification of credentialsVerifications) {
    if (verification.kind === 'fail') {
      errors.push(...verification.errors);
    }
  }

  // Verify all proofs.
  const proofVerification = await Promise.all(
    presentation.proofs?.map(async (proof) => {
      const chainVerification = await verifyPresentationChain(presentation, proof);
      if (chainVerification.kind === 'fail') {
        return chainVerification;
      }
      const signatureVerification = await verifyPresentationSignature(presentation, proof);
      if (signatureVerification.kind === 'fail') {
        return signatureVerification;
      }
      return { kind: 'pass' } as VerificationResult;
    }) ?? [],
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
      errors,
    };
  }
};

export const verifyPresentationChain = async (
  presentation: Presentation,
  proof: Proof,
): Promise<VerificationResult> => {
  for (const credential of presentation.credentials ?? []) {
    if (!credential.issuer.equals(proof.signer)) {
      if (!proof.chain) {
        return {
          kind: 'fail',
          errors: ['Delegated credential is missing credential chain.'],
        };
      }

      const chainVerification = await verifyChain(proof.chain, credential.subject.id, proof.signer);
      if (chainVerification.kind === 'fail') {
        return chainVerification;
      }
    }
  }

  return { kind: 'pass' };
};

/**
 * Verifies that the signature is valid and was made by the signer.
 * Does not validate other semantics (e.g. chains).
 */
export const verifyPresentationSignature = async (
  presentation: Presentation,
  proof: Proof,
): Promise<VerificationResult> => {
  if (proof.type !== SIGNATURE_TYPE_ED25519) {
    return {
      kind: 'fail',
      errors: [`Invalid signature type: ${proof.type}`],
    };
  }

  const signData = getPresentationProofPayload(presentation.credentials ?? [], proof);
  if (!(await verifySignature(proof.signer, signData, proof.value))) {
    return { kind: 'fail', errors: ['Invalid signature'] };
  }

  return { kind: 'pass' };
};
