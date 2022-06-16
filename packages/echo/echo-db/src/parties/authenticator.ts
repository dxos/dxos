//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Authenticator, codec, createAuthMessage, createEnvelopeMessage, createFeedAdmitMessage, PartyAuthenticator } from '@dxos/credentials';
import { failUndefined, raise } from '@dxos/debug';
import { FeedKey, PartyKey } from '@dxos/echo-protocol';

import { IdentityNotInitializedError } from '../errors';
import { IdentityProvider } from '../halo';
import { PartyProcessor } from '../pipeline';

const log = debug('dxos:echo-db:authenticator');

export function createAuthenticator (partyProcessor: PartyProcessor, identityProvider: IdentityProvider): Authenticator {
  return new PartyAuthenticator(partyProcessor.state, async auth => {
    if (auth.feedAdmit && auth.feedKey && !partyProcessor.isFeedAdmitted(auth.feedKey)) {
      const deviceKeyChain = identityProvider().deviceKeyChain ?? identityProvider().deviceKey;
      if (!deviceKeyChain) {
        log('Not device key chain available to admit new member feed');
        return;
      }

      await partyProcessor.writeHaloMessage(createEnvelopeMessage(
        identityProvider().keyring,
        partyProcessor.partyKey,
        auth.feedAdmit,
        [deviceKeyChain]
      ));
    }
  });
}

export interface CredentialsProvider {
  /**
   * The credentials (e.g., a serialized AuthMessage) as a bytes.
   */
  get (): Buffer
}

export function createCredentialsProvider (identityProvider: IdentityProvider, partyKey: PartyKey, feedKey: FeedKey): CredentialsProvider {
  return {
    get: () => {
      const identity = identityProvider();
      const signingKey = identity.deviceKeyChain ?? identity.deviceKey ?? raise(new IdentityNotInitializedError());
      return Buffer.from(codec.encode(createAuthMessage(
        identity.signer,
        partyKey,
        identity.identityKey ?? raise(new IdentityNotInitializedError()),
        signingKey,
        identity.keyring.getKey(feedKey)?.publicKey,
        undefined,
        createFeedAdmitMessage(
          identity.signer,
          partyKey,
          feedKey,
          [identity.keyring.getKey(feedKey) ?? failUndefined(), signingKey]
        )
      )));
    }
  };
}
