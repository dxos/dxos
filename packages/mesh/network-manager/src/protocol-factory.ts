//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { discoveryKey, keyToString } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { ProtocolProvider } from './network-manager';

const log = debug('dxos:network-manager:protocol-factory');

interface ProtocolFactoryOptions {
  plugins: any[],
  getTopics: () => Buffer[],
  initiator: boolean,
  session: Record<string, any>
}

/**
 * Returns a function that takes a channel parameter, returns a Protocol object
 * with its context set to channel, plugins from plugins parameter and session
 * set to session parameter.
 *
 * @param plugins array of Protocol plugin objects to add to created Protocol objects
 * @param getTopics retrieve a list of known topic keys to encrypt by public key.
 * @deprecated
 */
// TODO(dboreham): Deprecate, replace with protocol provider factory functions.
export const protocolFactory = ({ session = {}, plugins = [], getTopics, initiator }: ProtocolFactoryOptions): ProtocolProvider => {
  assert(getTopics);
  // eslint-disable-next-line no-unused-vars
  return ({ channel }: {channel: Buffer}) => {
    const protocol = new Protocol({
      streamOptions: { live: true },
      discoveryToPublicKey: (dk) => {
        const publicKey = getTopics().find(topic => discoveryKey(topic).equals(dk));
        if (publicKey) {
          protocol.setContext({ topic: keyToString(publicKey) });
        }
        assert(publicKey, 'PublicKey not found in discovery.');
        return publicKey;
      },
      initiator,
      userSession: session,
      discoveryKey: channel
    });

    protocol
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init();

    log('Created protocol');
    return protocol;
  };
};

/**
 * Creates a ProtocolProvider for simple transport connections with only one protocol plugin.
 */
export const transportProtocolProvider = (rendezvousKey: Buffer, peerId: Buffer, protocolPlugin: any, opts?: {initiator: boolean}): ProtocolProvider => {
  return protocolFactory({
    getTopics: () => {
      return [rendezvousKey];
    },
    session: { peerId },
    plugins: [protocolPlugin],
    initiator: !!opts?.initiator
  });
};
