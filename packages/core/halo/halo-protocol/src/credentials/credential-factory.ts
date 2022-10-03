//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { TypedMessage } from '@dxos/protocols';
import { Chain, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getSignaturePayload } from './signing';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier';

export type CreateCredentialSignerParams = {
  subject: PublicKey
  assertion: TypedMessage
  nonce?: Uint8Array
}

export type CreateCredentialParams = {
  signer: Signer
  issuer: PublicKey
  signingKey?: PublicKey

  // Provided only if signer is different from issuer.
  chain?: Chain

  subject: PublicKey
  assertion: TypedMessage
  nonce?: Uint8Array
}

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
  nonce
}: CreateCredentialParams): Promise<Credential> => {
  assert(assertion['@type'], 'Invalid assertion.');
  assert(!!signingKey === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain) {
    const result = await verifyChain(chain, issuer, signingKey!);
    assert(result.kind === 'pass', 'Invalid chain.');
  }

  // Create the credential with proof value and chain fields missing (for signature payload).
  const credential: Credential = {
    issuer,
    issuanceDate: new Date(),
    subject: {
      id: subject,
      assertion
    },
    proof: {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: new Date(),
      signer: signingKey ?? issuer,
      value: new Uint8Array(),
      nonce
    }
  };

  // Set proof after creating signature.
  const signedPayload = getSignaturePayload(credential);
  credential.proof.value = await signer.sign(signingKey ?? issuer, signedPayload);
  if (chain) {
    credential.proof.chain = chain;
  }

  return credential;
};

// TODO(burdon): Use consistently (merge halo/echo protocol packages).
export const createCredentialMessage = (credential: Credential) => {
  return {
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential
  };
};

export interface CredentialSigner {
  getIssuer(): PublicKey
  createCredential: (params: CreateCredentialSignerParams) => Promise<Credential>
}

/**
 * Issue credentials directly signed by the issuer.
 */
export const createCredentialSignerWithKey = (
  signer: Signer,
  issuer: PublicKey
): CredentialSigner => ({
  getIssuer: () => issuer,
  createCredential: ({ subject, assertion, nonce }) => createCredential({
    signer,
    issuer,
    subject,
    assertion,
    nonce
  })
});

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createCredentialSignerWithChain = (
  signer: Signer,
  chain: Chain,
  signingKey: PublicKey
): CredentialSigner => ({
  getIssuer: () => chain.credential.issuer,
  createCredential: ({ subject, assertion, nonce }) => createCredential({
    signer,
    issuer: chain.credential.issuer,
    signingKey,
    chain,
    subject,
    assertion,
    nonce
  })
});
