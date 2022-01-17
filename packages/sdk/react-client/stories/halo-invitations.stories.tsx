//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';

import { Awaited } from '@dxos/async';
import { Client, decodeInvitation, PendingInvitation } from '@dxos/client';

import {
  ClientProvider,
  ProfileInitializer,
  useClient,
  useParties,
  useProfile
} from '../src';
import {
  ClientPanel, Container, PartyJoinPanel
} from './helpers';

export default {
  title: 'react-client/HALO Invitations'
};

// code debug.enable('dxos:*');

/**
 * Creates device invitation.
 */
const HaloInvitationContainer = () => {
  const client = useClient();
  const [invitation, setInvitation] = useState<PendingInvitation | undefined>();
  const [pin, setPin] = useState('');

  const handleCreateInvitation = async () => {
    const invitation = await client.createHaloInvitation({
      onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
        setInvitation(undefined);
        setPin('');
      },
      onPinGenerated: setPin
    });

    setInvitation(invitation);
  };

  if (!client.halo.hasProfile()) {
    return null;
  }

  return (
    <Box sx={{ padding: 1 }}>
      <Toolbar>
        <Button
          onClick={handleCreateInvitation}
        >
          Create Invitation
        </Button>
      </Toolbar>

      {invitation && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            multiline
            fullWidth
            value={invitation.invitationCode}
            maxRows={3}
          />
        </Box>
      )}

      {pin && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            type='text'
            value={pin}
          />
        </Box>
      )}
    </Box>
  );
};

interface Status {
  error?: any,
  identity?: string,
  finishAuthentication?: Awaited<ReturnType<Client['joinHaloInvitation']>>
}

/**
 * Processes device invitations/authentication.
 */
const HaloAuthenticationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<Status>({});

  const handleSubmit = async (invitationCode: string) => {
    try {
      const invitation = decodeInvitation(invitationCode);

      // Claim an invitation for this device to join an existing Halo.
      if (invitation.identityKey) {
        const finishAuthentication = await client.joinHaloInvitation(invitation);
        setStatus({ identity: invitation.identityKey.toString(), finishAuthentication });
      }
    } catch (err: any) {
      // TODO(burdon): Doesn't support retry. Provide hint (eg, should retry/cancel).
      setStatus({ error: err });
    }
  };

  const handleAuthenticate = async (pin: string) => {
    await status.finishAuthentication?.(pin);
  };

  return (
    <PartyJoinPanel
      status={status}
      onSubmit={handleSubmit}
      onAuthenticate={handleAuthenticate}
    />
  );
};

const TestApp = () => {
  const client = useClient();
  const parties = useParties();
  const profile = useProfile();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      flexShrink: 0,
      overflow: 'hidden',
      margin: 1
    }}>
      <Paper>
        <ClientPanel client={client} profile={profile} parties={parties} />
        <Divider />
        <HaloInvitationContainer />
        {!profile && (
          <>
            <Divider />
            <HaloAuthenticationContainer />
          </>
        )}
      </Paper>
    </Box>
  );
};

export const Primary = () => {
  const peers = 2;

  return (
    <Container>
      <Box sx={{ display: 'flex', flex: 1, padding: 1, justifyContent: 'space-around' }}>
        {/* Instantiated Client. */}
        <ClientProvider>
          <ProfileInitializer>
            <TestApp />
          </ProfileInitializer>
        </ClientProvider>

        {/* Joiners. */}
        {[...new Array(peers)].map((_, i) => (
          <ClientProvider key={i}>
            <TestApp />
          </ClientProvider>
        ))}
      </Box>
    </Container>
  );
};
