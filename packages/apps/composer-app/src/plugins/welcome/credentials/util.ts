//
// Copyright 2024 DXOS.org
//

import { type PublicKey } from '@dxos/client';
import { type Credential, type Identity } from '@dxos/client/halo';

import { codec } from './codec';

// TODO(burdon): Factor out to @dxos/hub-protocol.

export const matchServiceCredential =
  (capabilities: string[] = []) =>
  (credential: Credential) => {
    if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.ServiceAccess') {
      return false;
    }

    const { capabilities: credentialCapabilities } = credential.subject.assertion;
    return capabilities.every((capability) => credentialCapabilities.includes(capability));
  };

/**
 * Activate account.
 * @param params.hubUrl
 * @param params.identity
 * @param params.token
 */
export const activateAccount = async ({
  hubUrl,
  identity,
  token,
  referrer,
}: {
  hubUrl: string;
  identity: Identity;
  token?: string;
  referrer?: PublicKey;
}): Promise<Credential> => {
  const response = await fetch(new URL('/account/activate', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityDid: `did:key:${identity.identityKey.toHex()}`,
      referrerDid: referrer ? `did:key:${referrer.toHex()}` : undefined,
      token,
    }),
  });
  if (!response.ok) {
    throw new Error('activation failed', { cause: response.statusText });
  }

  // Decode and save credential in HALO.
  const { credential } = await response.json();
  return credential && codec.decode<Credential>(credential);
};
