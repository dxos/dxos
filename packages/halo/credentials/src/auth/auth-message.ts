//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey, PublicKeyLike } from '@dxos/crypto';

import { Keyring } from '../keys';
import { wrapMessage } from '../party';
import { Auth, KeyChain, KeyRecord, Message, WithTypeUrl } from '../proto';

/**
 * Create `dxos.credentials.auth.Auth` credentials.
 */
export const createAuthMessage = (
  keyring: Keyring,
  partyKey: PublicKeyLike,
  identityKey: KeyRecord,
  deviceKey: KeyRecord | KeyChain,
  feedKey?: KeyRecord,
  nonce?: Buffer
): WithTypeUrl<Message> => {
  assert(keyring);

  partyKey = PublicKey.from(partyKey);

  const signingKeys = [deviceKey];
  if (feedKey) {
    signingKeys.push(feedKey);
  }

  const authMessage: WithTypeUrl<Auth> = {
    __type_url: 'dxos.credentials.auth.Auth',
    partyKey,
    identityKey: identityKey.publicKey,
    deviceKey: deviceKey.publicKey,
    feedKey: feedKey?.publicKey
  };

  return wrapMessage(keyring.sign(authMessage, signingKeys, nonce));
};
