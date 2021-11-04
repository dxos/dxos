//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';

import {
  ClientInitializer,
  decodeInvitation,
  encodeInvitation,
  ProfileInitializer,
  useClient,
  useParties,
  useProfile,
  useSecretGenerator,
  useSecretProvider
} from '../src';
import {
  ClientPanel,
  PartyJoinPanel,
  Container
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
  const [secretProvider, pin, resetPin] = useSecretGenerator();

  const handleCreateInvitation = async () => {
    const invitation = await client.createHaloInvitation(secretProvider, {
      onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
        setInvitationCode(undefined);
        resetPin();
      }
    });

    setInvitationCode(encodeInvitation(invitation));
  };

  if (!client.halo.isInitialized) {
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

/**
 * Processes device invitations/authentication.
 */
const HaloAuthenticationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<any>({});
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();

  const handleSubmit = async (invitationCode: string) => {
    try {
      const invitation = decodeInvitation(invitationCode);

      // Create an invitation for this device to join an existing Halo.
      if (invitation.identityKey) {
        await client.echo.halo.join(invitation, secretProvider);
        setStatus({ identity: invitation.identityKey.toString() });
      }
    } catch (err) {
      // TODO(burdon): Doesn't support retry. Provide hint (eg, should retry/cancel).
      setStatus({ error: err });
    }
  };

  const handleAuthenticate = (pin: string) => {
    secretResolver(Buffer.from(pin));
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
        {!client.echo.halo.isInitialized && (
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
        <ClientInitializer config={{}}>
          <ProfileInitializer>
            <TestApp />
          </ProfileInitializer>
        </ClientInitializer>

        {/* Joiners. */}
        {[...new Array(peers)].map((_, i) => (
          <ClientInitializer key={i} config={{}}>
            <TestApp />
          </ClientInitializer>
        ))}
      </Box>
    </Container>
  );
};
