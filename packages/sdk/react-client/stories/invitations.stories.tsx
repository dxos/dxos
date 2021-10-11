//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { defaultSecretProvider } from '@dxos/credentials';

import { ClientInitializer, decodeInvitation, encodeInvitation, useClient } from '../src';

import { useTestPeers } from './helpers';

export default {
  title: 'react-client/Party invitations'
};

const TestApp = () => {
  const [timestamp, setTimestamp] = useState(Date.now);
  const [invitationCode, setInvitationCode] = useState('');
  const client = useClient();
  const [peer] = useTestPeers(1);

  // Initialize client.
  useEffect(() => {
    setImmediate(async () => {
      await client.halo.createProfile({ username: 'Test' });
    });
  }, []);

  // Create remote party.
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

  // Join party
  useEffect(() => {
    if (!invitationCode) {
      return;
    }

    setImmediate(async () => {
      const invitation = decodeInvitation(invitationCode);
      // TODO(burdon): Attempts to contact network if secret provider isn't given.
      await client.echo.joinParty(invitation, defaultSecretProvider);
      setTimestamp(Date.now());
    });
  }, [invitationCode]);

  return (
    <div>
      <div style={{ padding: 8 }}>
        <h2>Config</h2>
        <pre>
          {JSON.stringify(client.config, undefined, 2)}
        </pre>
      </div>

      <div style={{ padding: 8 }}>
        <h2>Client</h2>
        <pre>
          {String(client.echo)}
        </pre>
      </div>

      <div style={{ padding: 8 }}>
        <h2>Peer</h2>
        <pre>
          {String(peer)}
        </pre>
      </div>

      <div style={{ padding: 8 }}>
        <h2>Invitation Code</h2>
        <textarea defaultValue={invitationCode} cols={80} rows={6} />
      </div>

      <div style={{ padding: 8 }}>
        T:{timestamp}
      </div>
    </div>
  );
};

export const Primary = () => {
  return (
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <TestApp />
    </ClientInitializer>
  );
};
