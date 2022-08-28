//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { discoveryKey } from '@dxos/crypto';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { PublicKey } from '@dxos/protocols';

import { ProtocolProvider } from './network-manager';

const log = debug('dxos:network-manager:protocol-factory');

interface ProtocolFactoryOptions {
  plugins: any[]
  getTopics: () => Buffer[]
  session: Record<string, any>
}

/**
 * Returns a function that takes a channel parameter, returns a Protocol object
 * with its context set to channel, plugins from plugins parameter and session
 * set to session parameter.
 *
 * @param plugins array of Protocol plugin objects to add to created Protocol objects
 * @param getTopics retrieve a list of known topic keys to encrypt by public key.
 * @deprecated Use `createProtocolFactory`.
 */
export const protocolFactory = ({ session = {}, plugins = [], getTopics }: ProtocolFactoryOptions): ProtocolProvider => {
  assert(getTopics);
  // eslint-disable-next-line no-unused-vars
  return ({ channel, initiator }) => {
    const protocol = new Protocol({
      streamOptions: { live: true },
      discoveryToPublicKey: (dk) => {
        const publicKey = getTopics().find(topic => discoveryKey(topic).equals(dk));
        if (publicKey) {
          protocol.setContext({ topic: PublicKey.stringify(publicKey) });
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

export interface Plugin {
  createExtension: () => Extension
}

export const createProtocolFactory = (topic: PublicKey, peerId: PublicKey, plugins: Plugin[]) => protocolFactory({
  getTopics: () => [topic.asBuffer()],
  session: { peerId: PublicKey.stringify(peerId.asBuffer()) },
  plugins
});

/**
 * Creates a ProtocolProvider for simple transport connections with only one protocol plugin.
 * @deprecated Use `createProtocolFactory`.
 */
export const transportProtocolProvider = (rendezvousKey: Buffer, peerId: Buffer, protocolPlugin: any): ProtocolProvider => protocolFactory({
  getTopics: () => [rendezvousKey],
  session: { peerId: PublicKey.stringify(peerId) },
  plugins: [protocolPlugin]
});
