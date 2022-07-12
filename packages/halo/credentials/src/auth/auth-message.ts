//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey, PublicKeyLike } from '@dxos/protocols';

import { Signer, SigningKey } from '../keys';
import { wrapMessage } from '../party';
import { Auth, KeyChain, KeyRecord, Message, WithTypeUrl } from '../proto';

/**
 * Create `dxos.credentials.auth.Auth` credentials.
 */
export const createAuthMessage = (
  signer: Signer,
  partyKey: PublicKeyLike,
  identityKey: KeyRecord,
  deviceKey: KeyRecord | KeyChain,
  feedKey?: PublicKey,
  nonce?: Buffer,
  feedAdmit?: Message
): WithTypeUrl<Message> => {
  assert(signer);

  partyKey = PublicKey.from(partyKey);

  const signingKeys: SigningKey[] = [deviceKey];
  if (feedKey) {
    signingKeys.push(feedKey);
  }

  const authMessage: WithTypeUrl<Auth> = {
    '@type': 'dxos.credentials.auth.Auth',
    partyKey,
    identityKey: identityKey.publicKey,
    deviceKey: deviceKey.publicKey,
    feedKey: feedKey,
    feedAdmit
  };

  return wrapMessage(signer.sign(authMessage, signingKeys, nonce));
};
