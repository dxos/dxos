//
// Copyright 2022 DXOS.org
//

import { pipeline } from 'stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Teleport } from '@dxos/teleport';
import { afterTest } from '@dxos/test';

import { PresenceExtension } from './presence-extension';

/**
 * Simulates two peers connected via P2P network.
 */
export const createStreamPair = async ({
  peerId1 = PublicKey.random(),
  peerId2 = PublicKey.random()
}: {
  peerId1?: PublicKey;
  peerId2?: PublicKey;
} = {}) => {
  const peer1 = new Teleport({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1 });

  pipeline(peer1.stream, peer2.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(peer2.stream, peer1.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  afterTest(() => peer1.close());
  afterTest(() => peer2.close());

  await Promise.all([peer1.open(), peer2.open()]);

  return { peer1, peer2 };
};

/**
 * Two peers with presence extensions pre-registered.
 */
export const createPresencePair = async (params: { peerId1?: PublicKey; peerId2?: PublicKey }) => {
  const { peer1, peer2 } = await createStreamPair(params);

  const presence1 = new PresenceExtension();
  peer1.addExtension('dxos.mesh.teleport.replicator', presence1);

  const presence2 = new PresenceExtension();
  peer2.addExtension('dxos.mesh.teleport.replicator', presence2);

  return { presence1, presence2 };
};
