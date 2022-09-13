//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { AdmittedFeed, Chain, Credential, PartyMember } from '../proto';
import { getSignaturePayload, sign } from './signing';
import { MessageType } from './types';
import { SIGNATURE_TYPE_ED25519 } from './verifier';

export type CreateCredentialParams = {
  subject: PublicKey
  assertion: MessageType
  issuer: PublicKey
  keyring: Signer
  /**
   * Provided if it is different from issuer.
   */
  signingKey?: PublicKey
  /**
   * Provided if signing key is different from issuer.
   */
  chain?: Chain

  nonce?: Uint8Array
}

export const createCredential = async (opts: CreateCredentialParams): Promise<Credential> => {
  assert(opts.assertion['@type'], 'Invalid assertion.');
  assert(!!opts.signingKey === !!opts.chain, 'Chain must be provided if and only if the signing key differs from the issuer.');

  // TODO(dmaretskyi): Verify chain.

  const signingKey = opts.signingKey ?? opts.issuer;

  // Form a temporary credential with signature fields missing. This will act as an input data for the signature.
  const credential: Credential = {
    subject: {
      id: opts.subject,
      assertion: opts.assertion
    },
    issuer: opts.issuer,
    issuanceDate: new Date(),
    proof: {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: new Date(),
      signer: signingKey,
      nonce: opts.nonce,
      value: new Uint8Array(),
      chain: undefined
    }
  };

  const signData = getSignaturePayload(credential);
  const signature = await sign(opts.keyring, signingKey, signData);

  credential.proof.value = signature;
  if (opts.chain) {
    credential.proof.chain = opts.chain;
  }

  return credential;
};

export const createPartyGenesisCredential = (keyring: Signer, partyKey: PublicKey) =>
  createCredential({
    subject: partyKey,
    issuer: partyKey,
    assertion: {
      '@type': 'dxos.halo.credentials.PartyGenesis',
      partyKey
    },
    keyring
  });

export const createGenesisCredentialSequence = async (
  keyring: Signer,
  partyKey: PublicKey,
  identityKey: PublicKey,
  deviceKey: PublicKey,
  feedKey: PublicKey
) => [
  await createPartyGenesisCredential(keyring, partyKey),
  await createCredential({
    issuer: partyKey,
    subject: identityKey,
    assertion: {
      '@type': 'dxos.halo.credentials.PartyMember',
      partyKey,
      role: PartyMember.Role.ADMIN
    },
    keyring
  }),
  await createCredential({
    issuer: identityKey,
    subject: feedKey,
    assertion: {
      '@type': 'dxos.halo.credentials.AdmittedFeed',
      partyKey,
      identityKey,
      deviceKey,
      designation: AdmittedFeed.Designation.CONTROL
    },
    keyring,
  })
]