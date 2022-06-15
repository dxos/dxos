//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Authenticator, createEnvelopeMessage, PartyAuthenticator } from '@dxos/credentials';

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
