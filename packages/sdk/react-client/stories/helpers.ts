//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { createKeyPair } from '@dxos/crypto';
import { ECHO } from '@dxos/echo-db';
import { encodeInvitation, useClient } from '../src';

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

/**
 * Asynchronously create a remote peer with a party.
 */
export const useTestInvitation = () => {
  const [invitationCode, setInvitationCode] = useState<string | undefined>(undefined);
  const [peer] = useTestPeers(1);

  useEffect(() => {
    if (!peer) {
      return;
    }

    setImmediate(async () => {
      const party = await peer.createParty();
      const invitation = await party.createInvitation();
      setInvitationCode(encodeInvitation(invitation));
    });
  }, [peer]);

  return invitationCode;
};

/**
 * Asynchronoulsy registry the client.
 */
export const useInitializedClient = (username: string = 'Test') => {
  const client = useClient();
  const [initialized, setInitialize] = useState(false);

  // Initialize client.
  useEffect(() => {
    setImmediate(async () => {
      await client.halo.createProfile({ username });
      setInitialize(client.halo.isInitialized);
    });
  }, []);

  return initialized;
}
