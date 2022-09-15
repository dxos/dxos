//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@mui/material';

import { Client } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { DXOS, FullScreen } from '@dxos/react-components';
import { createIframePort } from '@dxos/rpc-tunnel';

// TODO(wittjosiah): Should this be a separate entry point?

/**
 * Renders form for authorizing apps to join an identity.
 */
export const AuthPage = () => {
  const { origin } = useParams();
  const client = useClient();
  const [remoteClient, setRemoteClient] = useState<Client>();

  useAsyncEffect(async () => {
    if (!origin) {
      return;
    }

    const rpcPort = createIframePort(origin);
    const remoteClient = new Client(client.config, { rpcPort });
    await remoteClient.initialize();
    setRemoteClient(remoteClient);
  }, [origin]);

  const handleLogin = useCallback(async () => {
    console.log({ remoteClient });
    if (!remoteClient) {
      return;
    }

    const invitation = await client.halo.createInvitation();
    console.log({ invitation });
    const acceptedInvitation = await remoteClient.halo.acceptInvitation(invitation.descriptor);
    console.log({ acceptedInvitation });
    await acceptedInvitation.authenticate(invitation.secret);
    console.log('accepted');
  }, [remoteClient]);

  return (
    <FullScreen sx={{
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Button
        variant='contained'
        onClick={handleLogin}
      >
        <DXOS sx={{ marginRight: 1 }} />
        Login with HALO
      </Button>
    </FullScreen>
  );
};
