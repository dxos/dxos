//
// Copyright 2019 DXOS.org
//

import debug from 'debug';
import moment from 'moment';

import { PublicKey } from '@dxos/protocols';
import { Auth } from '@dxos/protocols/proto/dxos/halo/credentials/auth';
import { SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { isSignedMessage, PartyState } from '../party';

const log = debug('dxos:halo:auth');

const MAX_AGE = 24 * 60 * 60; // One day.

/**
 * Interface for Authenticators.
 * Used by AuthPlugin for authenticating nodes during handshake.
 */
// TODO(telackey): Explain here the intention behind the interface:
//  E.g., to have different authentication methods (besides the current PartyAuthenticator) for replication auth,
//  or to use this base class everywhere auth is done in the project (not used in greeting at present, for example)?
export interface Authenticator {
  /**
   * Return true if the credentials checkout, else false.
   */
  authenticate(credentials: SignedMessage): Promise<boolean>
}

/**
 * A Party-based Authenticator, which checks that the supplied credentials belong to a Party member.
 */
export class PartyAuthenticator implements Authenticator {

  /**
   * Takes the target Party for checking admitted keys and verifying signatures.
   */
  constructor (
    private readonly _party: PartyState,
    private readonly _onAuthenticated?: (auth: Auth) => Promise<void>
  ) {}

  /**
   * Authenticate the credentials presented during handshake. The signature on the credentials must be valid and belong
   * to a key already admitted to the Party.
   * @param credentials
   * @returns {boolean} true if authenticated, else false
   */
  // TODO(dboreham): Verify that credentials is a message of type `dxos.credentials.SignedMessage`
  //  signing a message of type `dxos.credentials.auth.Auth`.
  async authenticate (credentials: SignedMessage): Promise<boolean> {
    if (!credentials || !isSignedMessage(credentials)) {
      log('Bad credentials:', credentials);
      return false;
    }

    const { created, payload: auth = {} } = credentials.signed || {};
    const { deviceKey, identityKey, partyKey } = auth;
    if (!created || !PublicKey.isPublicKey(deviceKey) || !PublicKey.isPublicKey(identityKey) || !PublicKey.isPublicKey(partyKey)) {
      log('Bad credentials:', credentials);
      return false;
    }

    /*
     * TODO(telackey): This is not how it should be done. We would rather use the remote
     * nonce for anti-replay, but we will need to add hooks for retrieving it and signing it
     * between connect() and handshake() to do that. In the meantime, not allowing infinite replay
     * is at least something.
     */
    const then = moment(created, 'YYYY-MM-DDTHH:mm:ssZ', true);
    if (!then.isValid()) {
      log(`Bad credentials: invalid created ${created} time.`);
      return false;
    }

    const diff = moment().diff(then, 'seconds');
    if (Math.abs(diff) > MAX_AGE) {
      log(`Bad credentials: time skew too large: ${diff}ms`);
      return false;
    }

    // Check that the Party matches.
    if (!this._party.publicKey.equals(partyKey)) {
      log(`Wrong party: ${credentials}`);
      return false;
    }

    const verified = this._party.verifySignatures(credentials);

    if (
      verified
      // feedAdmit &&
      // PublicKey.isPublicKey(feedKey) &&
      // !this._party.memberFeeds.find(partyFeed => partyFeed.equals(feedKey))
    ) {
      log(`Member authenticated: deviceKey=${deviceKey}, identityKey=${identityKey}`);
      await this._onAuthenticated?.(auth);
    }

    return verified;
  }
}
