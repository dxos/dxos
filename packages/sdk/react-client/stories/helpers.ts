//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { createKeyPair } from '@dxos/crypto';
import { ECHO } from '@dxos/echo-db';

/**
 * Asynchronously create an array of peer ECHO instances.
 */
export const useTestPeers = (n: number = 1) => {
  const [peers, setPeers] = useState<ECHO[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const peers = [...new Array(n)].map(() => new ECHO());

      await Promise.all(peers.map(async (peer, i) => {
        await peer.open();
        await peer.halo.createIdentity({ ...createKeyPair() });
        await peer.halo.create(`Peer ${i}`);
      }));

      setPeers(peers);

      return () => {
        peers.forEach(peer => peer.close());
      }
    });
  }, []);

  return peers;
}
