//
// Copyright 2022 DXOS.org
//

import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { Chain, Credential } from '../proto';
import { createCredential } from './credential-factory';
import { MessageType } from './types';

export type CredentialSignerParams = {
  subject: PublicKey
  assertion: MessageType
  nonce?: Uint8Array
}

export interface CredentialSigner {
  getIssuer(): PublicKey
  createCredential: (params: CredentialSignerParams) => Promise<Credential>
}

/**
 * Issue credentials directly signed by the issuer.
 */
export const createKeyCredentialSigner = (
  signer: Signer,
  issuer: PublicKey
): CredentialSigner => ({
  getIssuer: () => issuer,
  createCredential: params => createCredential({
    keyring: signer,
    issuer,

    subject: params.subject,
    assertion: params.assertion as any,
    nonce: params.nonce
  })
});

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createChainCredentialSigner = (
  signer: Signer,
  chain: Chain,
  signingKey: PublicKey
): CredentialSigner => ({
  getIssuer: () => chain.credential.issuer,
  createCredential: params => createCredential({
    keyring: signer,
    issuer: chain.credential.issuer,
    signingKey,
    chain,

    subject: params.subject,
    assertion: params.assertion as any,
    nonce: params.nonce
  })
});
