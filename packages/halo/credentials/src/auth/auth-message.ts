//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { WithTypeUrl } from '@dxos/codec-protobuf';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { Auth } from '@dxos/protocols/proto/dxos/halo/credentials/auth';
import { KeyChain, KeyRecord } from '@dxos/protocols/proto/dxos/halo/keys';
import { Message } from '@dxos/protocols/proto/dxos/halo/signed';

import { Signer, SigningKey } from '../keys';
import { wrapMessage } from '../party';

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
    '@type': 'dxos.halo.credentials.auth.Auth',
    partyKey,
    identityKey: identityKey.publicKey,
    deviceKey: deviceKey.publicKey,
    feedKey,
    feedAdmit
  };

  return wrapMessage(signer.sign(authMessage, signingKeys, nonce));
};
