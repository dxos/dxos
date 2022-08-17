//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Keyring } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';

import { Credential } from './proto';
import { getSignaturePayload, sign } from './signing';
import { getCredentialAssertion, MessageType } from './types';
import { SIGNATURE_TYPE_ED25519 } from './verifier';
import { raise } from '@dxos/debug';
import { ComplexMap } from '@dxos/util';
import { isValidAuthorizedDeviceCredential } from './assertions';

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
  chain?: ComplexMap<PublicKey, Credential>,

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
    credential.proof.chain = { 
      credentials: Object.fromEntries(Array.from(opts.chain.entries()).map(([key, cred]) => [key.toHex(), cred])),
    };
  }

  return credential;
};

export type BuildDeviceChainParams = {
  credentials: Credential[],
  device: PublicKey,
  identity: PublicKey,
}

/**
 * Recursively build a credential chain to prove delegated authority of a given device. 
 */
export const buildDeviceChain = ({ credentials, device, identity }: BuildDeviceChainParams): ComplexMap<PublicKey, Credential> => {
  const result = new ComplexMap<PublicKey, Credential>(x => x.toHex())

  const insertCredentials = (key: PublicKey) => {
    const credential = credentials.find(c => isValidAuthorizedDeviceCredential(c, key, identity))
      ?? raise(new Error(`Unable to build device credential chain: Missing credential for device: ${key}`));

    result.set(key, credential);

    if(result.has(credential.issuer)) {
      throw new Error(`Cyclic credential chain detected for keys: ${Array.from(result.keys())}`)
    }

    if (!credential.issuer.equals(identity)) {
      insertCredentials(credential.issuer);
    }
  }

  insertCredentials(device);
  return result;
}