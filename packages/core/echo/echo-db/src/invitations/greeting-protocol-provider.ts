//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { protocolFactory } from '@dxos/network-manager';

/**
 * Creates a duplex connection with a single peer using a common rendezvous key as topic.
 * @param peerId
 * @param protocolPlugins
 * @param rendezvousKey
 * @return {Object} swarm
 */
// TODO(burdon): When closed?
// TODO(dboreham): Write a test to check resources are released (no resource leaks).
export const greetingProtocolProvider = (rendezvousKey: any, peerId: Buffer | Uint8Array, protocolPlugins: any[]) => protocolFactory({
  getTopics: () => [rendezvousKey],
  session: { peerId: PublicKey.stringify(peerId) },
  plugins: protocolPlugins
});
