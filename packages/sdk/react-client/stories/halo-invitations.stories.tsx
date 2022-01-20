//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';

import { decodeInvitation, encodeInvitation, Invitation } from '@dxos/client';

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
  const [invitationCode, setInvitationCode] = useState<string>();
  const [pin, setPin] = useState('');

  const resetInvitations = () => {
    setInvitationCode('');
    setPin('');
  };

  const handleCreateInvitation = async () => {
    resetInvitations();

    const invitation = await client.halo.createInvitation();
    invitation.finished.on(() => resetInvitations());
    invitation.connected.on(() => {
      setPin(invitation.secret.toString())
    })

    setInvitationCode(encodeInvitation(invitation.descriptor));
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

      {invitationCode && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            multiline
            fullWidth
            value={invitationCode}
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
  invitation?: Invitation
}

/**
 * Processes device invitations/authentication.
 */
const HaloAuthenticationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<Status>({});

  const handleSubmit = async (invitationCode: string) => {
    try {
      const invitationDescriptor = decodeInvitation(invitationCode);
      const invitation = await client.halo.acceptInvitation(invitationDescriptor);
      setStatus({ identity: invitationDescriptor.identityKey?.toString(), invitation });

    } catch (err: any) {
      // TODO(burdon): Doesn't support retry. Provide hint (eg, should retry/cancel).
      setStatus({ error: err });
    }
  };

  const handleAuthenticate = async (pin: string) => {
    await status.invitation?.authenticate(Buffer.from(pin));
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
