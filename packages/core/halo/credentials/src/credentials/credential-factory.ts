//
// Copyright 2022 DXOS.org
//

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type TypedMessage } from '@dxos/protocols';
import { type Chain, type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialProofPayload } from './signing';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier';

export type CreateCredentialSignerParams = {
  subject: PublicKey;
  assertion: TypedMessage;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

export type CreateCredentialParams = {
  signer: Signer;
  issuer: PublicKey;
  signingKey?: PublicKey;

  // Provided only if signer is different from issuer.
  chain?: Chain;

  subject: PublicKey;
  assertion: TypedMessage;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
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
}: CreateCredentialParams): Promise<Credential> => {
  invariant(assertion['@type'], 'Invalid assertion.');
  invariant(!!signingKey === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain) {
    const result = await verifyChain(chain, issuer, signingKey!);
    invariant(result.kind === 'pass', 'Invalid chain.');
  }

  // Create the credential with proof value and chain fields missing (for signature payload).
  const credential: Credential = {
    issuer,
    issuanceDate: new Date(),
    subject: {
      id: subject,
      assertion,
    },
    proof: {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: new Date(),
      signer: signingKey ?? issuer,
      value: new Uint8Array(),
      nonce,
    },
  };

  if ((parentCredentialIds?.length ?? 0) > 0) {
    credential.parentCredentialIds = parentCredentialIds;
  }

  // Set proof after creating signature.
  const signedPayload = getCredentialProofPayload(credential);
  credential.proof!.value = await signer.sign(signingKey ?? issuer, signedPayload);
  if (chain) {
    credential.proof!.chain = chain;
  }

  credential.id = PublicKey.from(await subtleCrypto.digest('SHA-256', signedPayload));

  return credential;
};

// TODO(burdon): Use consistently (merge halo/echo protocol packages).
export const createCredentialMessage = (credential: Credential) => {
  return {
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential,
  };
};

// TODO(burdon): Vs. Signer.
export interface CredentialSigner {
  getIssuer(): PublicKey;
  createCredential: (params: CreateCredentialSignerParams) => Promise<Credential>;
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
  getIssuer: () => chain.credential.issuer,
  createCredential: ({ subject, assertion, nonce }) =>
    createCredential({
      signer,
      issuer: chain.credential.issuer,
      signingKey,
      chain,
      subject,
      assertion,
      nonce,
    }),
});
