//
// Copyright 2022 DXOS.org
//

import { verifySignature } from '@dxos/crypto';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Presentation, type Proof } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import {
  SIGNATURE_TYPE_ED25519,
  type VerificationResult,
  verifyChain,
  verifyCredential,
} from '../credentials/index.ts';
import { getPresentationProofPayload } from './signing.ts';

export const verifyPresentation = async (presentation: Presentation): Promise<VerificationResult> => {
  const errors: string[] = [];

  // Verify all credentials.
  const credentialsVerifications = await Promise.all(
    presentation.credentials.map((credential) => verifyCredential(credential)),
  );
  for (const verification of credentialsVerifications) {
    if (verification.kind === 'fail') {
      errors.push(...verification.errors);
    }
  }

  // Verify all proofs.
  const proofVerification = await Promise.all(
    presentation.proofs.map(async (proof) => {
      const chainVerification = await verifyPresentationChain(presentation, proof);
      if (chainVerification.kind === 'fail') {
        return chainVerification;
      }
      const signatureVerification = await verifyPresentationSignature(presentation, proof);
      if (signatureVerification.kind === 'fail') {
        return signatureVerification;
      }
      return { kind: 'pass' } as VerificationResult;
    }),
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
  const signer = toPublicKey(proof.signer);
  if (!signer) {
    return { kind: 'fail', errors: ['Proof has no signer.'] };
  }

  for (const credential of presentation.credentials) {
    if (toPublicKey(credential.issuer)?.equals(signer)) {
      continue;
    }
    if (!proof.chain) {
      return {
        kind: 'fail',
        errors: ['Delegated credential is missing credential chain.'],
      };
    }

    const subject = toPublicKey(credential.subject?.id);
    if (!subject) {
      return { kind: 'fail', errors: ['Credential has no subject.'] };
    }

    const chainVerification = await verifyChain(proof.chain, subject, signer);
    if (chainVerification.kind === 'fail') {
      return chainVerification;
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

  const signer = toPublicKey(proof.signer);
  if (!signer) {
    return { kind: 'fail', errors: ['Proof has no signer.'] };
  }

  const signData = getPresentationProofPayload(presentation.credentials, proof);
  if (!(await verifySignature(signer, signData, proof.value))) {
    return { kind: 'fail', errors: ['Invalid signature'] };
  }

  return { kind: 'pass' };
};
