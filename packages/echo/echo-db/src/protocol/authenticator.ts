//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Authenticator, codec, createAuthMessage, createEnvelopeMessage, createFeedAdmitMessage, PartyAuthenticator } from '@dxos/credentials';
import { FeedKey, PartyKey } from '@dxos/echo-protocol';

import { PartyProcessor } from '../pipeline';
import { CredentialsSigner } from './credentials-signer';

const log = debug('dxos:echo-db:authenticator');

export function createAuthenticator (partyProcessor: PartyProcessor, credentialsSigner: CredentialsSigner): Authenticator {
  return new PartyAuthenticator(partyProcessor.state, async auth => {
    if (auth.feedAdmit && auth.feedKey && !partyProcessor.isFeedAdmitted(auth.feedKey)) {
      log(`Admitting feed of authenticated member: ${auth.feedKey}`);
      await partyProcessor.writeHaloMessage(createEnvelopeMessage(
        credentialsSigner.signer,
        partyProcessor.partyKey,
        auth.feedAdmit,
        [credentialsSigner.getDeviceSigningKeys()]
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

export function createCredentialsProvider (credentialsSigner: CredentialsSigner, partyKey: PartyKey, feedKey: FeedKey): CredentialsProvider {
  return {
    get: () => {
      return Buffer.from(codec.encode(createAuthMessage(
        credentialsSigner.signer,
        partyKey,
        credentialsSigner.getIdentityKey(),
        credentialsSigner.getDeviceSigningKeys(),
        feedKey,
        undefined,
        createFeedAdmitMessage(
          credentialsSigner.signer,
          partyKey,
          feedKey,
          [feedKey, credentialsSigner.getDeviceSigningKeys()]
        )
      )));
    }
  };
}
