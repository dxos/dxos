//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { Client, Party } from '@dxos/client';

/**
 * Returns a set of peers joined in a shared party.
 * Useful for setting up examples or tests which display multiple peers in a single view.
 */
export const usePartyBootstrap = (peerCount = 2) => {
  const [peers, setPeers] = useState<{ client: Client; party: Party }[]>([]);

  useEffect(() => {
    setTimeout(async () => {
      const peers = [];
      const inviter = new Client();
      await inviter.initialize();
      await inviter.halo.createProfile({ displayName: 'peer-0' });
      const inviterParty = await inviter.echo.createParty();
      peers.push({ client: inviter, party: inviterParty });

      for (let i = 1; i < peerCount; i++) {
        const joiner = new Client();
        await joiner.initialize();
        await joiner.halo.createProfile({ displayName: `peer-${i}` });
        // TODO(burdon): Observer.
        await inviterParty.createInvitation();
        // await joiner.echo.acceptInvitation(invitation);
        // peers.push({ client: joiner, party: joinerParty });
      }

      setPeers(peers);
    });
  }, []);

  return peers;
};
