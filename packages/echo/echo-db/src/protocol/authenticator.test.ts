//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createAuthMessage, createKeyAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';

import { PartyProcessor } from '../pipeline';
import { createAuthenticator } from './authenticator';
import { CredentialsSigner } from './credentials-signer';

describe('authenticator', () => {
  // TODO(dmaretskyi): Figure out how credentials work and if this test makes sense.
  test.skip('authenticates admitted peer', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    const signer = CredentialsSigner.createDirectDeviceSigner(keyring);

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    await partyProcessor.processMessage({
      data: createPartyGenesisMessage(
        keyring,
        partyKey,
        feedKey.publicKey,
        identityKey
      ),
      meta: {} as any
    });
    await partyProcessor.processMessage({
      data: createKeyAdmitMessage(
        keyring,
        partyKey.publicKey,
        identityKey,
        [partyKey, identityKey]
      ),
      meta: {} as any
    });
    await partyProcessor.processMessage({
      data: createKeyAdmitMessage(
        keyring,
        partyKey.publicKey,
        deviceKey,
        [identityKey, deviceKey]
      ),
      meta: {} as any
    });

    const authenticator = createAuthenticator(partyProcessor, signer, null as any);
    const credential = createAuthMessage(
      keyring,
      partyKey.publicKey,
      identityKey,
      deviceKey
    );

    expect(await authenticator.authenticate(credential.payload)).toEqual(true);
  });
});
