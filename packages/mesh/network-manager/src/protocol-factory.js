//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { discoveryKey, keyToString } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

const log = debug('dxos:network-manager:protocol-factory');

/**
 * Returns a function that takes a channel parameter, returns a Protocol object
 * with its context set to channel, plugins from plugins parameter and session
 * set to session parameter.
 *
 * @param {Object} session TODO(burdon): Document this.
 * @param {[plugin]} plugins array of Protocol plugin objects to add to created Protocol objects
 * @param {function() : Buffer[]} getTopics retrieve a list of known topic keys to encrypt by public key.
 * @return {ProtocolProvider}
 * @deprecated
 */
// TODO(dboreham): Deprecate, replace with protocol provider factory functions.
export const protocolFactory = ({ session = {}, plugins = [], getTopics }) => {
  assert(getTopics);
  // eslint-disable-next-line no-unused-vars
  return ({ channel }) => {
    const protocol = new Protocol({
      streamOptions: { live: true },
      discoveryToPublicKey: (dk) => {
        const publicKey = getTopics().find(topic => discoveryKey(topic).equals(dk));
        if (publicKey) {
          protocol.setContext({ topic: keyToString(publicKey) });
        }
        return publicKey;
      }
    });

    protocol
      .setSession(session)
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init(channel);

    log('Created protocol');
    return protocol;
  };
};

/**
 * Creates a ProtocolProvider for simple transport connections with only one protocol plugin.
 * @param rendezvousKey
 * @param peerId
 * @param protocolPlugin
 * @return {ProtocolProvider}
 */
export const transportProtocolProvider = (rendezvousKey, peerId, protocolPlugin) => {
  return protocolFactory({
    getTopics: () => {
      return [rendezvousKey];
    },
    session: { peerId },
    plugins: [protocolPlugin]
  });
};
