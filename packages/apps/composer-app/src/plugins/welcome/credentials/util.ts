//
// Copyright 2024 DXOS.org
//

import { type Credential, type Identity } from '@dxos/client/halo';

import { codec } from './codec';

// TODO(burdon): Factor out to @dxos/hub-protocol.

export const isServiceCredential = (credential: Credential) =>
  credential.subject.assertion['@type'] === 'dxos.halo.credentials.ServiceAccess';

/**
 * Activate account.
 * @param identity
 * @param hubUrl
 * @param token
 */
export const activateAccount = async (identity: Identity, hubUrl: string, token?: string): Promise<Credential> => {
  const response = await fetch(new URL('/account/activate', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, identityDid: `did:key:${identity.identityKey.toHex()}` }),
  });
  if (!response.ok) {
    throw new Error('activation failed', { cause: response.statusText });
  }

  // Decode and save credential in HALO.
  const { credential } = await response.json();
  return codec.decode<Credential>(credential);
};
