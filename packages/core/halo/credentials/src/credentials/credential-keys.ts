//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { toDate, toPublicKey } from '@dxos/protocols/buf';
import { type Chain, type Credential, type Proof } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

//
// buf carries `dxos.keys.PublicKey` as a message and drops proto3 `optional`, so every key on a
// credential reads as an optional message rather than the `PublicKey` the domain uses. These
// readers resolve one and assert its presence, which is what a credential's own invariants already
// require: nothing that has been verified is missing its issuer, subject or proof.
//

/** The key that issued a credential. */
export const issuerOf = (credential: Credential): PublicKey => {
  const issuer = toPublicKey(credential.issuer);
  invariant(issuer, 'Credential has no issuer.');
  return issuer;
};

/** The key a credential makes its assertion about. */
export const subjectIdOf = (credential: Credential): PublicKey => {
  const subject = toPublicKey(credential.subject?.id);
  invariant(subject, 'Credential has no subject.');
  return subject;
};

/** The id of a credential that has been signed, which is the digest of its signing payload. */
export const credentialIdOf = (credential: Credential): PublicKey => {
  const id = toPublicKey(credential.id);
  invariant(id, 'Credential has no id.');
  return id;
};

/** When a credential was issued. */
export const issuanceDateOf = (credential: Credential): Date => {
  const date = toDate(credential.issuanceDate);
  invariant(date, 'Credential has no issuance date.');
  return date;
};

/** The proof of a credential that was signed. */
export const proofOf = (credential: Credential): Proof => {
  invariant(credential.proof, 'Credential has no proof.');
  return credential.proof;
};

/** The chain of a credential signed by a delegated key. */
export const chainOf = (credential: Credential): Chain => {
  const { chain } = proofOf(credential);
  invariant(chain, 'Credential has no chain.');
  return chain;
};

/** The credential establishing the authority of a delegated signer. */
export const chainCredentialOf = (credential: Credential): Credential => {
  const { credential: chained } = chainOf(credential);
  invariant(chained, 'Credential chain is empty.');
  return chained;
};
