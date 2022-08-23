//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Keyring } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { Chain, Credential } from '../proto';
import { isValidAuthorizedDeviceCredential } from './assertions';
import { getSignaturePayload, sign } from './signing';
import { MessageType } from './types';
import { SIGNATURE_TYPE_ED25519 } from './verifier';

export type CreateCredentialParams = {
  subject: PublicKey
  assertion: MessageType,
  issuer: PublicKey,
  keyring: Keyring
  /**
   * Provided if it is different from issuer.
   */
  signingKey?: PublicKey
  /**
   * Provided if signing key is different from issuer.
   */
  chain?: Chain,

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

/**
 * Recursively build a credential chain to prove delegated authority of a given device.
 */
export const buildDeviceChain: (opts: {
  credentials: Credential[],
  identity: PublicKey,
  device: PublicKey,
}) => Chain = ({
  credentials,
  identity,
  device
}) => {
  const result = new ComplexMap<PublicKey, Credential>(key => key.toHex());

  const insertCredentials = (key: PublicKey) => {
    const credential = credentials.find(c => isValidAuthorizedDeviceCredential(c, identity, key)) ??
      raise(new Error(`Unable to build device credential chain: Missing credential for device: ${key}`));

    result.set(key, credential);

    if (result.has(credential.issuer)) {
      throw new Error(`Cyclic credential chain detected for keys: ${Array.from(result.keys())}`);
    }

    if (!credential.issuer.equals(identity)) {
      insertCredentials(credential.issuer);
    }
  };

  insertCredentials(device);
  return {
    credentials: Object.fromEntries(Array.from(result.entries()).map(([key, cred]) => [key.toHex(), cred]))
  };
};
