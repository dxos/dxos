//
// Copyright 2019 DXOS.org
//

import debug from 'debug';
import { EventEmitter } from 'events';
import assert from 'node:assert';

import { Extension, ERR_EXTENSION_RESPONSE_FAILED, Protocol } from '@dxos/mesh-protocol';

import { codec } from '../proto';
import { Authenticator } from './authenticator';
import { ERR_AUTH_GENERAL, ERR_AUTH_REJECTED } from './error-codes';

const log = debug('dxos:halo:auth');

const EXTENSION_NAME = 'dxos.halo.credentials.auth';

/**
 * A Protocol extension to require nodes to be authenticated during handshake before being allowed to replicate.
 *
 * Authentication success event
 * @event AuthPlugin#authenticated
 * @type {Buffer} peerId
 */
export class AuthPlugin extends EventEmitter {
  _requiredForExtensions: Set<string>;

  constructor (
    private _peerId: Buffer,
    private _authenticator: Authenticator,
    /** (default is always) */ requireAuthForExtensions: string[] = []
  ) {
    super();
    assert(Buffer.isBuffer(_peerId));
    assert(_authenticator);

    // TODO(burdon): Not used.
    this._requiredForExtensions = new Set(requireAuthForExtensions);
  }

  get authenticator () {
    return this._authenticator;
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
          this.emit('allowed-unauthenticated', sessionPeerId);
          return;
        }
      }

      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, ERR_AUTH_REJECTED, 'Authentication rejected: no credentials.');
    }

    let wrappedCredentials;
    try {
      // TODO(dboreham): Credentials is a base64-encoded string. Determine if that's the type we expect.
      // TODO(dboreham): Should have assert(isString(credentials)) ?
      wrappedCredentials = codec.decode(Buffer.from(credentials, 'base64'));
    } catch (err: any) {
      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, ERR_AUTH_GENERAL, err);
    }

    // Unwrap from root message.
    const { payload } = wrappedCredentials;

    // The peerId in the normal session info should match that in the signed credentials.
    const { payload: { deviceKey: credsPeerId } } = payload?.signed || {};
    if (!sessionPeerId || !credsPeerId || !credsPeerId.equals(sessionPeerId)) {
      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, ERR_AUTH_REJECTED, 'Authentication rejected: bad peerId.');
    }

    /* TODO(telackey): The signed credentials ought to contain verifiable information for both ends, eg,
     * the ID of both source and target, and a nonce or challenge provided by the target to the source
     * for this particular exchange. We will need to add appropriate hooks between the connect and
     * handshake calls to do that though.
     */

    // Ask the Authenticator if this checks out.
    const authenticated = await this._authenticator.authenticate(payload);
    if (!authenticated) {
      protocol.stream.destroy();
      throw new ERR_EXTENSION_RESPONSE_FAILED(EXTENSION_NAME, ERR_AUTH_REJECTED, 'Authentication rejected: bad credentials.');
    }

    // Success!
    log(`Authenticated peer: ${credsPeerId.toHex()}`);
    /* TODO(dboreham): Should this be a callback rather than an event, or communicated some other way to
     *   code that needs to know about auth success events?
     */
    this.emit('authenticated', credsPeerId.asBuffer());
  }
}
