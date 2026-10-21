//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type PublicKey } from '@dxos/keys';
import { fromPublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import { type Credential, type IdentityAdmin, IdentityAdminSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type SpecificCredential, specificCredential } from './assertions.ts';
import { type CredentialSigner } from './credential-factory.ts';
import { verifyCredential } from './verifier.ts';

/**
 * Makes `adminKey` an admin of the signer's identity, as a person administers an agent. The signer's issuer is the
 * administered identity, so the grant holds wherever its HALO is read, whatever space memberships say.
 */
export const createIdentityAdminCredential = (signer: CredentialSigner, adminKey: PublicKey): Promise<Credential> =>
  signer.createCredential({
    subject: adminKey,
    assertion: create(IdentityAdminSchema, {
      identityKey: fromPublicKey(signer.getIssuer()),
      adminKey: fromPublicKey(adminKey),
    }),
  });

export type IdentityAdminFailure = 'malformed' | 'invalid-signature' | 'wrong-identity';

export type VerifiedIdentityAdmin = {
  identityKey: PublicKey;
  adminKey: PublicKey;
  issuedAt: Date;
  assertion: IdentityAdmin;
};

export type IdentityAdminVerification =
  | { kind: 'pass'; admin: VerifiedIdentityAdmin }
  | { kind: 'fail'; reason: IdentityAdminFailure; errors?: string[] };

/**
 * Verifies a grant of admin over `identityKey`: the signature (and any delegation chain) must hold, and `identityKey`
 * must have issued it, so no other identity can name the identity's admins.
 */
export const verifyIdentityAdmin = async (
  credential: Credential,
  identityKey: PublicKey,
): Promise<IdentityAdminVerification> => {
  let specific: SpecificCredential<IdentityAdmin> | undefined;
  try {
    specific = specificCredential<IdentityAdmin>(credential, 'dxos.halo.credentials.IdentityAdmin');
  } catch {
    // An assertion whose bytes do not decode throws rather than reading as absent.
    return { kind: 'fail', reason: 'malformed' };
  }
  const issuer = toPublicKey(credential.issuer);
  const subject = toPublicKey(credential.subject?.id);
  const administered = toPublicKey(specific?.assertion.identityKey);
  const adminKey = toPublicKey(specific?.assertion.adminKey);
  const issuedAt = toDate(credential.issuanceDate);
  if (!specific || !issuer || !subject || !administered || !adminKey || !issuedAt || !subject.equals(adminKey)) {
    return { kind: 'fail', reason: 'malformed' };
  }

  const result = await verifyCredential(credential);
  if (result.kind === 'fail') {
    return { kind: 'fail', reason: 'invalid-signature', errors: result.errors };
  }
  if (!issuer.equals(identityKey) || !administered.equals(identityKey)) {
    return { kind: 'fail', reason: 'wrong-identity' };
  }

  return {
    kind: 'pass',
    admin: { identityKey, adminKey, issuedAt, assertion: specific.assertion },
  };
};
