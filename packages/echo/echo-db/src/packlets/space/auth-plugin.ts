//
// Copyright 2019 DXOS.org
//

import assert from 'node:assert';

import { Extension, ERR_EXTENSION_RESPONSE_FAILED, Protocol } from '@dxos/mesh-protocol';

import { SwarmIdentity } from './space-protocol';
import { log } from '@dxos/log'


const EXTENSION_NAME = 'dxos.credentials.auth';

/**
 * A Protocol extension to require nodes to be authenticated during handshake before being allowed to replicate.
 *
 * Authentication success event
 */
export class AuthPlugin {
  _requiredForExtensions: Set<string>;

  constructor (
    private readonly _swarmIdentity: SwarmIdentity,
    /** (default is always) */ requireAuthForExtensions: string[] = []
  ) {
    this._requiredForExtensions = new Set(requireAuthForExtensions);
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension () {
    return new Extension(EXTENSION_NAME, { binary: true }).setHandshakeHandler(this._onHandshake.bind(this));
  }

  /**
   * Handler to be called when the 'handshake' event is emitted.
   * If the session can not be authenticated, a ERR_EXTENSION_RESPONSE_FAILED will be thrown.
   * @fires AuthPlugin#authenticated
   */
  /* TODO(dboreham): Improve Protocol to avoid this:
   * Below, the pattern throw(ERR_EXTENSION_RESPONSE_FAILED(<details>) is used in place of
   * simply sending a response to the peer's authentication request.
   * This is done because there is no known way using the current lower layer
   * implementation (Protocol, dependencies) to explicitly send such a response message.
   */
  // TODO(telackey): Supply further background/detail and correct anything incorrect above.
  private async _onHandshake (protocol: Protocol /* code , context */) { // TODO(burdon): ???
    assert(protocol);

    // Obtain the credentials from the session.
    // At this point credentials is protobuf encoded and base64-encoded.
    // Note `protocol.session.credentials` is our data.
    const { credentials, peerId: sessionPeerId } = protocol?.getSession() ?? {};

    log(`Handshake`, { credentials, sessionPeerId })

    if (!credentials) {
      // If we only require auth when certain extensions are active, check if those are present.
      if (this._requiredForExtensions.size) {
        let authRequired = false;
        for (const name of protocol.stream.remoteExtensions.names) {
          if (this._requiredForExtensions.has(name)) {
            log(`Auth required for extension: ${name}`);
            authRequired = true;
            break;
          }
        }

        /* We can allow the unauthenticated connection, because none of the extensions which
         * require authentication to use are active on this connection.
         */
        if (!authRequired) {
          log(`Unauthenticated access allowed for ${sessionPeerId};`,
            'no extensions which require authentication are active on remote Protocol.');
          return;
        }
      }

      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, 'ERR_AUTH_REJECTED', 'Authentication rejected: no credentials.');
    }

    // Challenges are not currently supported.
    const nonce = Buffer.from('');

    const credentialsBuf = Buffer.from(credentials, 'base64')
    const isAuthenticated = await this._swarmIdentity.credentialAuthenticator(nonce, credentialsBuf)

    // Ask the Authenticator if this checks out.
    if (!isAuthenticated) {
      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, 'ERR_AUTH_REJECTED', 'Authentication rejected: bad credentials.');
    }

    // Success!
    // log(`Authenticated peer: ${credsPeerId.toHex()}`);
    /* TODO(dboreham): Should this be a callback rather than an event, or communicated some other way to
     *   code that needs to know about auth success events?
     */
    // this.emit('authenticated', credsPeerId.asBuffer());
  }
}
