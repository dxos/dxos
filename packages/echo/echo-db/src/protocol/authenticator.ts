//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Message as HaloMessage, Authenticator, codec, createAuthMessage, createEnvelopeMessage, createFeedAdmitMessage, PartyAuthenticator } from '@dxos/credentials';
import { FeedKey, FeedWriter, PartyKey } from '@dxos/echo-protocol';

import { PartyProcessor } from '../pipeline';
import { CredentialsSigner } from './credentials-signer';

const log = debug('dxos:echo-db:authenticator');

export const createAuthenticator = (
  partyProcessor: PartyProcessor,
  credentialsSigner: CredentialsSigner,
  credentialsWriter: FeedWriter<HaloMessage>
): Authenticator => new PartyAuthenticator(partyProcessor.state, async auth => {
  if (auth.feedAdmit && auth.feedKey && !partyProcessor.isFeedAdmitted(auth.feedKey)) {
    log(`Admitting feed of authenticated member: ${auth.feedKey}`);
    await credentialsWriter.write(createEnvelopeMessage(
      credentialsSigner.signer,
      partyProcessor.partyKey,
      auth.feedAdmit,
      [credentialsSigner.getDeviceSigningKeys()]
    ));
  }
});

export interface CredentialsProvider {
  /**
   * The credentials (e.g., a serialized AuthMessage) as a bytes.
   */
  get (): Buffer
}

export const createCredentialsProvider = (credentialsSigner: CredentialsSigner, partyKey: PartyKey, feedKey: FeedKey): CredentialsProvider => ({
  get: () => {
    const authMessage = createAuthMessage(
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
    );
    return Buffer.from(codec.encode(authMessage));
  }
});
