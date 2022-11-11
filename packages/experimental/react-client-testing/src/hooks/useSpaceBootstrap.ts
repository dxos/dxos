//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { Client, Space } from '@dxos/client';

/**
 * Returns a set of peers joined in a shared space.
 * Useful for setting up examples or tests which display multiple peers in a single view.
 */
export const useSpaceBootstrap = (peerCount = 2) => {
  const [peers, setPeers] = useState<{ client: Client; space: Space }[]>([]);

  useEffect(() => {
    setTimeout(async () => {
      const peers = [];
      const inviter = new Client();
      await inviter.initialize();
      await inviter.halo.createProfile({ displayName: 'peer-0' });
      const inviterSpace = await inviter.echo.createSpace();
      peers.push({ client: inviter, space: inviterSpace });

      for (let i = 1; i < peerCount; i++) {
        const joiner = new Client();
        await joiner.initialize();
        await joiner.halo.createProfile({ displayName: `peer-${i}` });
        // TODO(burdon): Observer.
        await inviterSpace.createInvitation();
        // await joiner.echo.acceptInvitation(invitation);
        // peers.push({ client: joiner, space: joinerSpace });
      }

      setPeers(peers);
    });
  }, []);

  return peers;
};
