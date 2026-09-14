//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { anyPackBare, fromDate, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { type Chain, type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type CredentialAssertion } from './assertions.ts';
import { getCredentialProofPayload } from './signing.ts';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier.ts';

export type CreateCredentialSignerProps = {
  subject: PublicKey;
  assertion: CredentialAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

export type CreateCredentialProps = {
  signer: Signer;
  issuer: PublicKey;
  signingKey?: PublicKey;

  // Provided only if signer is different from issuer.
  chain?: Chain;

  subject: PublicKey;
  assertion: CredentialAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

/**
 * Packs an assertion into the subject's `Any`, resolving its descriptor from its own `$typeName`.
 */
const packAssertion = (assertion: CredentialAssertion) => {
  const desc = bufRegistry.getMessage(assertion.$typeName);
  invariant(desc, `Assertion type is missing from the registry: ${assertion.$typeName}`);
  return anyPackBare(desc, assertion);
};

/**
 * Construct a signed credential message.
 */
export const createCredential = async ({
  signer,
  issuer,
  subject,
  assertion,
  signingKey,
  chain,
  nonce,
  parentCredentialIds,
}: CreateCredentialProps): Promise<Credential> => {
  invariant(!!signingKey === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain && signingKey) {
    const result = await verifyChain(chain, issuer, signingKey);
    invariant(result.kind === 'pass', 'Invalid chain.');
  }

  // Create the credential with proof value and chain fields missing (for signature payload).
  const credential = create(CredentialSchema, {
    issuer: fromPublicKey(issuer),
    issuanceDate: fromDate(new Date()),
    subject: {
      id: fromPublicKey(subject),
      assertion: packAssertion(assertion),
    },
    parentCredentialIds: (parentCredentialIds ?? []).map(fromPublicKey),
    proof: {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: fromDate(new Date()),
      signer: fromPublicKey(signingKey ?? issuer),
      value: new Uint8Array(),
      nonce,
    },
  });

  // Set proof after creating signature.
  const signedPayload = getCredentialProofPayload(credential);
  invariant(credential.proof, 'Proof was not created.');
  credential.proof.value = await signer.sign(signingKey ?? issuer, signedPayload);
  if (chain) {
    credential.proof.chain = chain;
  }

  credential.id = fromPublicKey(
    PublicKey.from(await subtleCrypto.digest('SHA-256', signedPayload as Uint8Array<ArrayBuffer>)),
  );

  return credential;
};

// TODO(burdon): Vs. Signer.
export interface CredentialSigner {
  getIssuer(): PublicKey;
  createCredential: (params: CreateCredentialSignerProps) => Promise<Credential>;
}

/**
 * Issue credentials directly signed by the issuer.
 */
export const createCredentialSignerWithKey = (signer: Signer, issuer: PublicKey): CredentialSigner => ({
  getIssuer: () => issuer,
  createCredential: ({ subject, assertion, nonce, parentCredentialIds }) =>
    createCredential({
      signer,
      issuer,
      subject,
      assertion,
      nonce,
      parentCredentialIds,
    }),
});

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createCredentialSignerWithChain = (
  signer: Signer,
  chain: Chain,
  signingKey: PublicKey,
): CredentialSigner => ({
  getIssuer: () => chainIssuer(chain),
  createCredential: ({ subject, assertion, nonce, parentCredentialIds }) =>
    createCredential({
      signer,
      issuer: chainIssuer(chain),
      signingKey,
      chain,
      subject,
      assertion,
      nonce,
      parentCredentialIds,
    }),
});

const chainIssuer = (chain: Chain): PublicKey => {
  const issuer = toPublicKey(chain.credential?.issuer);
  invariant(issuer, 'Chain credential has no issuer.');
  return issuer;
};
