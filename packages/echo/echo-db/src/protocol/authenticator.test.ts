//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { createAuthMessage, Keyring } from '@dxos/credentials';

import { PartyProcessor } from '../pipeline';
import { createAuthenticator } from './authenticator';
import { createTestIdentityCredentials } from './identity-credentials';

describe.skip('authenticator', () => {
  test('authenticates party creator', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    // await partyProcessor.processMessage({
    //   data: createPartyGenesisMessage(
    //     keyring,
    //     partyKey,
    //     feedKey.publicKey,
    //     partyKey
    //   ),
    //   meta: {} as any
    // });
    // await partyProcessor.processMessage({
    //   data: createEnvelopeMessage(
    //     identity.keyring,
    //     partyKey.publicKey,
    //     wrapMessage(identity.identityGenesis),
    //     [partyKey]
    //   ),
    //   meta: {} as any
    // });
    // await partyProcessor.processMessage({
    //   data: createFeedAdmitMessage(
    //     keyring,
    //     partyKey.publicKey,
    //     feedKey.publicKey,
    //     [identity.deviceKeyChain]
    //   ),
    //   meta: {} as any
    // });

    const authenticator = createAuthenticator(partyProcessor, identity.createCredentialsSigner(), null as any);

    //
    // This test follows the same party creation routing as party factory.
    // Oddly, it does not admit the device key to the party.
    // This means that authentication is actually done using the signature created using the feed key.
    //

    // Does not authenticate without the feed key.
    {
      const credential = createAuthMessage(
        keyring,
        partyKey.publicKey,
        identity.identityKey,
        identity.deviceKey
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
        feedKey.publicKey
      );
      expect(await authenticator.authenticate(credential.payload)).toEqual(true);
    }
  });

  test('authenticates another identity', async () => {
    const keyring = new Keyring();
    const identity = await createTestIdentityCredentials(keyring);
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    // await partyProcessor.processMessage({
    //   data: createPartyGenesisMessage(
    //     keyring,
    //     partyKey,
    //     feedKey.publicKey,
    //     partyKey
    //   ),
    //   meta: {} as any
    // });
    // await partyProcessor.processMessage({
    //   data: createEnvelopeMessage(
    //     identity.keyring,
    //     partyKey.publicKey,
    //     wrapMessage(identity.identityGenesis),
    //     [partyKey]
    //   ),
    //   meta: {} as any
    // });
    // await partyProcessor.processMessage({
    //   data: createFeedAdmitMessage(
    //     keyring,
    //     partyKey.publicKey,
    //     feedKey.publicKey,
    //     [identity.deviceKeyChain]
    //   ),
    //   meta: {} as any
    // });

    // const authenticator = createAuthenticator(partyProcessor, identity.createCredentialsSigner(), null as any);

    // const identity2 = await createTestIdentityCredentials(keyring);

    // await partyProcessor.processMessage({
    //   data: createKeyAdmitMessage(
    //     keyring,
    //     partyKey.publicKey,
    //     identity2.identityKey,
    //     [identity.deviceKeyChain]
    //   ),
    //   meta: {} as any
    // });
    // await partyProcessor.processMessage({
    //   data: createKeyAdmitMessage(
    //     keyring,
    //     partyKey.publicKey,
    //     identity2.deviceKey,
    //     [identity.deviceKeyChain]
    //   ),
    //   meta: {} as any
    // });

    // const credential = createAuthMessage(
    //   keyring,
    //   partyKey.publicKey,
    //   identity2.identityKey,
    //   identity2.deviceKey
    // );
    // expect(await authenticator.authenticate(credential.payload)).toEqual(true);
  });
});
