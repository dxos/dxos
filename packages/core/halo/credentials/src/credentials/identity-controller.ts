//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type PublicKey } from '@dxos/keys';
import { fromPublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import {
  type Credential,
  type IdentityController,
  IdentityControllerSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type SpecificCredential, specificCredential } from './assertions.ts';
import { type CredentialSigner } from './credential-factory.ts';
import { verifyCredential } from './verifier.ts';

/**
 * Grants `controllerKey` control of the signer's identity, as an admin controls an agent. The signer's issuer is the
 * controlled identity, so the grant holds wherever its HALO is read, whatever space memberships say.
 */
export const createIdentityControllerCredential = (
  signer: CredentialSigner,
  controllerKey: PublicKey,
): Promise<Credential> =>
  signer.createCredential({
    subject: controllerKey,
    assertion: create(IdentityControllerSchema, {
      identityKey: fromPublicKey(signer.getIssuer()),
      controllerKey: fromPublicKey(controllerKey),
    }),
  });

export type IdentityControllerFailure = 'malformed' | 'invalid-signature' | 'wrong-identity';

export type VerifiedIdentityController = {
  identityKey: PublicKey;
  controllerKey: PublicKey;
  issuedAt: Date;
  assertion: IdentityController;
};

export type IdentityControllerVerification =
  | { kind: 'pass'; controller: VerifiedIdentityController }
  | { kind: 'fail'; reason: IdentityControllerFailure; errors?: string[] };

/**
 * Verifies a grant of control over `identityKey`: the signature (and any delegation chain) must hold, and `identityKey`
 * must have issued it, so no other identity can name the identity's controllers.
 */
export const verifyIdentityController = async (
  credential: Credential,
  identityKey: PublicKey,
): Promise<IdentityControllerVerification> => {
  let specific: SpecificCredential<IdentityController> | undefined;
  try {
    specific = specificCredential<IdentityController>(credential, 'dxos.halo.credentials.IdentityController');
  } catch {
    // An assertion whose bytes do not decode throws rather than reading as absent.
    return { kind: 'fail', reason: 'malformed' };
  }
  const issuer = toPublicKey(credential.issuer);
  const subject = toPublicKey(credential.subject?.id);
  const controlled = toPublicKey(specific?.assertion.identityKey);
  const controllerKey = toPublicKey(specific?.assertion.controllerKey);
  const issuedAt = toDate(credential.issuanceDate);
  if (
    !specific ||
    !issuer ||
    !subject ||
    !controlled ||
    !controllerKey ||
    !issuedAt ||
    !subject.equals(controllerKey)
  ) {
    return { kind: 'fail', reason: 'malformed' };
  }

  const result = await verifyCredential(credential);
  if (result.kind === 'fail') {
    return { kind: 'fail', reason: 'invalid-signature', errors: result.errors };
  }
  if (!issuer.equals(identityKey) || !controlled.equals(identityKey)) {
    return { kind: 'fail', reason: 'wrong-identity' };
  }

  return {
    kind: 'pass',
    controller: { identityKey, controllerKey, issuedAt, assertion: specific.assertion },
  };
};
