//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { defaultSecretProvider } from '@dxos/credentials';

import { ClientInitializer, decodeInvitation, useClient, useInvitationRedeemer } from '../src';

import { useInitializedClient, useTestInvitation } from './helpers';

export default {
  title: 'react-client/Party invitations'
};

const PrimaryApp = () => {
  const [timestamp, setTimestamp] = useState(Date.now);
  const client = useClient();
  const initialized = useInitializedClient();
  const invitationCode = useTestInvitation();

  // Join party
  useEffect(() => {
    if (!initialized || !invitationCode) {
      return;
    }

    setImmediate(async () => {
      const invitation = decodeInvitation(invitationCode);
      // TODO(burdon): Attempts to contact network if secret provider isn't given.
      await client.echo.joinParty(invitation, defaultSecretProvider);
      setTimestamp(Date.now());
    });
  }, [initialized, invitationCode]);

  // TODO(burdon): Factor out UX.
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
        <h2>Invitation Code</h2>
        <textarea defaultValue={invitationCode} cols={80} rows={6} />
      </div>

      <div style={{ padding: 8 }}>
        [{timestamp}]
      </div>
    </div>
  );
};

export const Test = () => {
  return (
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <PrimaryApp />
    </ClientInitializer>
  );
};

const RedeemerApp = () => {
  const initialized = useInitializedClient();
  const invitationCode = useTestInvitation();

  // TODO(burdon): Remove callbacks.
  const [setInvitationCode, setPin] = useInvitationRedeemer({
    onDone: () => { console.log('done'); },
    onError: (error?: string) => { console.log('error', error) }
  });

  // Redeem code.
  useEffect(() => {
    if (!initialized || !invitationCode) {
      return;
    }

    // TODO(burdon): Attempts to contact network: error ERR_EXTENSION_RESPONSE_FAILED:
    setInvitationCode(invitationCode);
  }, [initialized, invitationCode]);

  // Set PIN.
  useEffect(() => {
    setTimeout(() => {
      setPin('0000'); // TODO(burdon): Configure defaultSecretProvider.
    }, 1000)
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <h2>Invitation Code</h2>
      <textarea defaultValue={invitationCode} cols={80} rows={6} />
    </div>
  );
}

export const UseInvitationRedeemer = () => {
  return (
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <RedeemerApp />
    </ClientInitializer>
  );
}
