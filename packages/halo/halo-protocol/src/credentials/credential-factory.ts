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
  issuer: PublicKey
  signer?: PublicKey

  // Provided only if signer is different from issuer.
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
  signer,
  chain,
  nonce
}: CreateCredentialParams): Promise<Credential> => {
  assert(assertion['@type'], 'Invalid assertion.');
  assert(!!signer === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain) {
    const result = await verifyChain(chain, issuer, signer!);
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
      signer: signer ?? issuer,
      value: new Uint8Array(),
      nonce
    }
  };

  // Set proof after creating signature.
  const signedPayload = getSignaturePayload(credential);
  credential.proof.value = await sign(keyring, signer ?? issuer, signedPayload);
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
    signer: signingKey,
    subject,
    assertion,
    nonce
  })
});
