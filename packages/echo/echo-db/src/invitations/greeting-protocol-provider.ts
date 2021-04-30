//
// Copyright 2020 DXOS.org
//

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
export const greetingProtocolProvider = (rendezvousKey: any, peerId: any, protocolPlugins: any[]) => {
  return protocolFactory({
    getTopics: () => {
      return [rendezvousKey];
    },
    session: { peerId },
    plugins: protocolPlugins
  });
};
