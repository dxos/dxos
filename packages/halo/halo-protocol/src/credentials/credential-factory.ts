//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { Chain, Credential } from '../proto';
import { getSignaturePayload, sign } from './signing';
import { MessageType } from './types';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier';

export type CreateCredentialSignerParams = {
  subject: PublicKey
  assertion: MessageType
  nonce?: Uint8Array
}

export type CreateCredentialParams = {
  keyring: Signer

  //
  issuer: PublicKey

  // Provided if different from issuer.
  signingKey?: PublicKey
  chain?: Chain

  subject: PublicKey
  assertion: MessageType
  nonce?: Uint8Array
}

/**
 * Construct a signed credential message.
 */
export const createCredential = async ({
  keyring,
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
  credential.proof.value = await sign(keyring, signingKey ?? issuer, signedPayload);
  if (chain) {
    credential.proof.chain = chain;
  }

  return credential;
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
    keyring: signer,
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
    keyring: signer,
    issuer: chain.credential.issuer,
    chain,
    signingKey,
    subject,
    assertion,
    nonce
  })
});
