//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Keyring } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';

import { ComplexMap } from '../../../common/util/src';
import { Credential } from './proto';
import { getSignData, sign } from './signing';
import { MessageType } from './types';
import { SIGNATURE_TYPE_ED25519 } from './verifier';

export interface CredentialCreationOpts {
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

export const createCredential = async (opts: CredentialCreationOpts): Promise<Credential> => {
  assert(opts.assertion['@type'], 'Invalid assertion.');
  assert(!!opts.signingKey === !!opts.chain, 'Chain must be provided if and only if the signing key differs from the issuer');

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

  const signData = getSignData(credential);
  const signature = await sign(opts.keyring, signingKey, signData);

  credential.proof.value = signature;
  if (opts.chain) {
    credential.proof.chain = Object.fromEntries(Array.from(opts.chain.entries()).map(([key, cred]) => [key.toHex(), cred]));
  }

  return credential;
};
