//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createAuthMessage, createEnvelopeMessage, createFeedAdmitMessage, createKeyAdmitMessage, createPartyGenesisMessage, Keyring, KeyType, wrapMessage } from '@dxos/credentials';

import { PartyProcessor } from '../pipeline';
import { createAuthenticator } from './authenticator';
import { createTestIdentityCredentials } from './identity-credentials';

describe('authenticator', () => {
  test('authenticates party creator', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    await partyProcessor.processMessage({
      data: createPartyGenesisMessage(
        keyring,
        partyKey,
        feedKey.publicKey,
        partyKey
      ),
      meta: {} as any
    });
    await partyProcessor.processMessage({
      data: createEnvelopeMessage(
        identity.keyring,
        partyKey.publicKey,
        wrapMessage(identity.identityGenesis),
        [partyKey]
      ),
      meta: {} as any
    });
    await partyProcessor.processMessage({
      data: createFeedAdmitMessage(
        keyring,
        partyKey.publicKey,
        feedKey.publicKey,
        [identity.deviceKeyChain]
      ),
      meta: {} as any
    });

    const authenticator = createAuthenticator(partyProcessor, identity.createCredentialsSigner(), null as any);

    // Does not authenticate without the feed key.
    {
      const credential = createAuthMessage(
        keyring,
        partyKey.publicKey,
        identity.identityKey,
        identity.deviceKey,
      );
      expect(await authenticator.authenticate(credential.payload)).toEqual(false);
    }
    
    // Does authenticate with the feed key.
    {
      const credential = createAuthMessage(
        keyring,
        partyKey.publicKey,
        identity.identityKey,
        identity.deviceKey,
        feedKey.publicKey,
      );
      expect(await authenticator.authenticate(credential.payload)).toEqual(true);
    }
  });
});
